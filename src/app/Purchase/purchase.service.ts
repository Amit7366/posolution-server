import httpStatus from "http-status";
import mongoose, { ClientSession, Types } from "mongoose";
import AppError from "../errors/AppError";
import { Product } from "../Product/product.model";
import { Supplier } from "../Supplier/supplier.model";
import { PurchaseDuePayment } from "../PurchaseDuePayment/purchaseDuePayment.model";
import { Purchase } from "./purchase.model";
import { TPurchaseItem, TPurchaseStatus, TPaymentType } from "./purchase.interface";
import { generateNextPurchaseNo } from "./purchase.utils";

type LineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
  discount?: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

async function buildLineItems(tenantId: string, lines: LineInput[]) {
  const items: TPurchaseItem[] = [];
  let subTotal = 0;
  let discountTotal = 0;

  for (const line of lines) {
    const pid = line.productId;
    if (!Types.ObjectId.isValid(pid)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid product id");
    }
    const product = await Product.findOne({
      _id: pid,
      tenantId,
      isDeleted: { $ne: true },
    })
      .select("name sku price")
      .lean();

    if (!product) {
      throw new AppError(httpStatus.BAD_REQUEST, "Product not found for this tenant");
    }

    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new AppError(httpStatus.BAD_REQUEST, "Each line needs quantity ≥ 1");
    }

    const unitPrice = roundMoney(Number(line.unitPrice));
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid unit price");
    }

    const discount = roundMoney(Math.max(0, Number(line.discount ?? 0)));
    const gross = roundMoney(qty * unitPrice);
    const lineTotal = roundMoney(gross - discount);
    if (lineTotal < 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "Line discount cannot exceed line subtotal");
    }

    subTotal = roundMoney(subTotal + gross);
    discountTotal = roundMoney(discountTotal + discount);

    items.push({
      productId: new Types.ObjectId(pid),
      productName: String(product.name),
      sku: product.sku ? String(product.sku) : "",
      qty,
      unitPrice,
      discount,
      lineTotal,
    });
  }

  return { items, subTotal, discountTotal };
}

function applyVat(
  subTotal: number,
  discountTotal: number,
  vatPercent: number
): { vatAmount: number; totalAmount: number } {
  const pct = Math.min(100, Math.max(0, Number(vatPercent) || 0));
  const base = roundMoney(subTotal - discountTotal);
  if (base < 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Discounts cannot exceed subtotal");
  }
  const vatAmount = roundMoney((base * pct) / 100);
  const totalAmount = roundMoney(base + vatAmount);
  return { vatAmount, totalAmount };
}

async function addStock(
  session: ClientSession,
  tenantId: string,
  lines: { productId: Types.ObjectId; qty: number }[]
) {
  for (const { productId, qty } of lines) {
    const updated = await Product.findOneAndUpdate(
      { _id: productId, tenantId, isDeleted: { $ne: true } },
      { $inc: { quantity: qty } },
      { session, new: true }
    );
    if (!updated) {
      throw new AppError(httpStatus.BAD_REQUEST, "Product missing during stock update");
    }
  }
}

async function reverseStock(
  session: ClientSession,
  tenantId: string,
  lines: { productId: Types.ObjectId; qty: number }[]
) {
  for (const { productId, qty } of lines) {
    const doc = await Product.findOne({
      _id: productId,
      tenantId,
      isDeleted: { $ne: true },
    }).session(session);

    if (!doc) {
      throw new AppError(httpStatus.BAD_REQUEST, "Product missing during stock reverse");
    }
    if (doc.quantity < qty) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot reverse stock for "${doc.name}" (need ${qty}, have ${doc.quantity})`
      );
    }
    doc.quantity -= qty;
    await doc.save({ session });
  }
}

async function resolveSupplier(
  tenantId: string,
  supplierId: string,
  overrides?: {
    supplierName?: string;
    supplierEmail?: string;
    supplierPhone?: string;
    supplierAddress?: string;
  }
) {
  if (!Types.ObjectId.isValid(supplierId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid supplier id");
  }
  const supplier = await Supplier.findOne({
    _id: supplierId,
    tenantId,
  }).lean();

  if (!supplier) {
    throw new AppError(httpStatus.BAD_REQUEST, "Supplier not found for this tenant");
  }

  return {
    supplierId: new Types.ObjectId(supplierId),
    supplierName: (overrides?.supplierName?.trim() || supplier.name).trim(),
    supplierEmail: overrides?.supplierEmail?.trim() ?? supplier.email ?? "",
    supplierPhone: overrides?.supplierPhone?.trim() ?? supplier.phone ?? "",
    supplierAddress: overrides?.supplierAddress?.trim() ?? supplier.address ?? "",
  };
}

type CreatePayload = {
  supplierId: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  title?: string;
  items: LineInput[];
  vatPercent?: number;
  paid?: number;
  status?: TPurchaseStatus;
  dueDate: string | Date;
  hold?: boolean;
  notes?: string;
  paymentType?: TPaymentType;
};

export const PurchaseService = {
  async createIntoDB(payload: CreatePayload, user: any, tenantId: string) {
    const supplier = await resolveSupplier(tenantId, payload.supplierId, payload);
    const built = await buildLineItems(tenantId, payload.items);
    const { vatAmount, totalAmount } = applyVat(
      built.subTotal,
      built.discountTotal,
      payload.vatPercent ?? 0
    );

    const paid = roundMoney(Math.max(0, Number(payload.paid ?? 0)));
    if (paid > totalAmount) {
      throw new AppError(httpStatus.BAD_REQUEST, "Paid amount cannot exceed total");
    }

    let status: TPurchaseStatus = "unpaid";
    if (paid >= totalAmount) status = "paid";

    const hold = Boolean(payload.hold);
    const shouldAdd = !hold;
    const paymentType: TPaymentType = payload.paymentType ?? "cash";

    const purchaseNo = await generateNextPurchaseNo(tenantId);
    const dueDate = new Date(payload.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid due date");
    }

    const linesForStock = built.items.map((i) => ({ productId: i.productId, qty: i.qty }));

    const commonFields = {
      tenantId,
      purchaseNo,
      ...supplier,
      title: payload.title?.trim() || "Purchase",
      items: built.items,
      subTotal: built.subTotal,
      discountTotal: built.discountTotal,
      vatPercent: Math.min(100, Math.max(0, Number(payload.vatPercent) || 0)),
      vatAmount,
      totalAmount,
      paid,
      status,
      dueDate,
      hold,
      notes: payload.notes?.trim() ?? "",
      paymentType,
      createdBy: user?.objectId,
    };

    if (shouldAdd) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await addStock(session, tenantId, linesForStock);
          await Purchase.create([{ ...commonFields, stockAdded: true }], { session });
        });
      } finally {
        await session.endSession();
      }
      const doc = await Purchase.findOne({ tenantId, purchaseNo }).lean();
      return doc;
    }

    const doc = await Purchase.create({
      ...commonFields,
      stockAdded: false,
    });

    return doc.toObject();
  },

  async getAllFromDB(
    tenantId: string,
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      status?: "all" | "paid" | "unpaid" | "overdue" | "due";
      since?: string;
      supplier?: string;
      supplierId?: string;
    }
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { tenantId, isDeleted: { $ne: true } };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (opts.status === "paid") filter.status = "paid";
    else if (opts.status === "unpaid") filter.status = "unpaid";
    else if (opts.status === "due") {
      filter.status = "unpaid";
      filter.hold = { $ne: true };
      filter.$expr = { $gt: [{ $subtract: ["$totalAmount", "$paid"] }, 0] };
    } else if (opts.status === "overdue") {
      filter.status = "unpaid";
      filter.hold = { $ne: true };
      filter.dueDate = { $lt: startOfToday };
      filter.$expr = { $gt: [{ $subtract: ["$totalAmount", "$paid"] }, 0] };
    }

    if (opts.search?.trim()) {
      const rx = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { purchaseNo: rx },
        { supplierName: rx },
        { supplierEmail: rx },
        { supplierPhone: rx },
        { title: rx },
      ];
    }

    if (opts.since) {
      const d = new Date(opts.since);
      if (!Number.isNaN(d.getTime())) {
        filter.createdAt = { $gte: d };
      }
    }

    if (opts.supplierId?.trim()) {
      if (!Types.ObjectId.isValid(opts.supplierId)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid supplier id");
      }
      filter.supplierId = new Types.ObjectId(opts.supplierId);
    } else if (opts.supplier?.trim()) {
      const rx = new RegExp(opts.supplier!.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.supplierName = rx;
    }

    const [data, total] = await Promise.all([
      Purchase.find(filter).sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Purchase.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  async getSingleFromDB(id: string, tenantId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid purchase id");
    }
    const doc = await Purchase.findOne({ _id: id, tenantId }).lean();
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");
    return doc;
  },

  async payDueIntoDB(
    id: string,
    tenantId: string,
    payload: { amount: number; paymentType?: TPaymentType; note?: string },
    user: any
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid purchase id");
    }

    const amount = roundMoney(Number(payload.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment amount must be greater than 0");
    }

    const session = await mongoose.startSession();
    let result: Record<string, unknown> | null = null;

    try {
      await session.withTransaction(async () => {
        const existing = await Purchase.findOne({ _id: id, tenantId }).session(session);
        if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");
        if (existing.hold) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "Cannot pay on a held purchase — confirm it first"
          );
        }

        const amountDue = roundMoney(existing.totalAmount - existing.paid);
        if (amountDue <= 0) {
          throw new AppError(httpStatus.BAD_REQUEST, "Purchase has no outstanding due");
        }
        if (amount > amountDue) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Payment amount exceeds due (${amountDue})`
          );
        }

        const paymentType: TPaymentType = payload.paymentType ?? "cash";
        const nextPaid = roundMoney(existing.paid + amount);
        const nextStatus: TPurchaseStatus =
          nextPaid >= existing.totalAmount ? "paid" : "unpaid";

        await PurchaseDuePayment.create(
          [
            {
              tenantId,
              purchaseId: existing._id,
              amount,
              paymentType,
              note: payload.note?.trim() ?? "",
              paidAt: new Date(),
              paidBy: user?.objectId,
            },
          ],
          { session }
        );

        existing.paid = nextPaid;
        existing.status = nextStatus;
        existing.updatedBy = user?.objectId;
        await existing.save({ session });

        result = {
          purchase: existing.toObject(),
          payment: {
            amount,
            paymentType,
            note: payload.note?.trim() ?? "",
            amountDue: roundMoney(existing.totalAmount - nextPaid),
          },
        };
      });
    } finally {
      await session.endSession();
    }

    return result;
  },

  async getPaymentsFromDB(purchaseId: string, tenantId: string) {
    if (!Types.ObjectId.isValid(purchaseId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid purchase id");
    }
    const purchase = await Purchase.findOne({ _id: purchaseId, tenantId }).select("_id").lean();
    if (!purchase) throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");

    const data = await PurchaseDuePayment.find({ tenantId, purchaseId })
      .sort({ paidAt: -1 })
      .lean();
    return data;
  },

  async updateIntoDB(
    id: string,
    tenantId: string,
    payload: Partial<CreatePayload> & { status?: TPurchaseStatus },
    user: any
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid purchase id");
    }

    const existing = await Purchase.findOne({ _id: id, tenantId });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");

    let nextItems = existing.items;
    let subTotal = existing.subTotal;
    let discountTotal = existing.discountTotal;
    let vatAmount = existing.vatAmount;
    let totalAmount = existing.totalAmount;

    if (payload.items?.length) {
      if (existing.stockAdded) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Cannot change line items after stock was added"
        );
      }
      const built = await buildLineItems(tenantId, payload.items);
      const v = applyVat(
        built.subTotal,
        built.discountTotal,
        payload.vatPercent ?? existing.vatPercent
      );
      nextItems = built.items as typeof existing.items;
      subTotal = built.subTotal;
      discountTotal = built.discountTotal;
      vatAmount = v.vatAmount;
      totalAmount = v.totalAmount;
    } else if (payload.vatPercent != null) {
      const v = applyVat(existing.subTotal, existing.discountTotal, payload.vatPercent);
      vatAmount = v.vatAmount;
      totalAmount = v.totalAmount;
    }

    let paid =
      payload.paid != null ? roundMoney(Math.max(0, Number(payload.paid))) : existing.paid;
    if (paid > totalAmount) {
      throw new AppError(httpStatus.BAD_REQUEST, "Paid amount cannot exceed total");
    }

    let status: TPurchaseStatus =
      payload.status === "paid" || payload.status === "unpaid"
        ? payload.status
        : existing.status;

    if (paid >= totalAmount) status = "paid";
    else if (payload.status !== "paid") status = "unpaid";

    const hold = payload.hold != null ? Boolean(payload.hold) : existing.hold;
    const shouldHaveStock = !hold;

    const linesForStock = nextItems.map((i) => ({
      productId: i.productId as Types.ObjectId,
      qty: i.qty,
    }));

    let stockAdded = existing.stockAdded;

    let supplierFields = {
      supplierId: existing.supplierId,
      supplierName: existing.supplierName,
      supplierEmail: existing.supplierEmail,
      supplierPhone: existing.supplierPhone,
      supplierAddress: existing.supplierAddress,
    };

    if (payload.supplierId) {
      supplierFields = await resolveSupplier(tenantId, payload.supplierId, payload);
    } else if (
      payload.supplierName ||
      payload.supplierEmail ||
      payload.supplierPhone ||
      payload.supplierAddress
    ) {
      supplierFields = {
        ...supplierFields,
        supplierName: payload.supplierName?.trim() ?? existing.supplierName,
        supplierEmail: payload.supplierEmail?.trim() ?? existing.supplierEmail,
        supplierPhone: payload.supplierPhone?.trim() ?? existing.supplierPhone,
        supplierAddress: payload.supplierAddress?.trim() ?? existing.supplierAddress,
      };
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (shouldHaveStock && !stockAdded) {
          await addStock(session, tenantId, linesForStock);
          stockAdded = true;
        } else if (!shouldHaveStock && stockAdded) {
          await reverseStock(session, tenantId, linesForStock);
          stockAdded = false;
        }

        let nextDue = existing.dueDate;
        if (payload.dueDate) {
          const d = new Date(payload.dueDate);
          if (Number.isNaN(d.getTime())) {
            throw new AppError(httpStatus.BAD_REQUEST, "Invalid due date");
          }
          nextDue = d;
        }

        existing.set({
          ...supplierFields,
          title: payload.title?.trim() ?? existing.title,
          items: nextItems,
          subTotal,
          discountTotal,
          vatPercent:
            payload.vatPercent != null
              ? Math.min(100, Math.max(0, Number(payload.vatPercent)))
              : existing.vatPercent,
          vatAmount,
          totalAmount,
          paid,
          status,
          dueDate: nextDue,
          hold,
          notes: payload.notes?.trim() ?? existing.notes,
          paymentType: payload.paymentType ?? existing.paymentType,
          stockAdded,
          updatedBy: user?.objectId,
        });

        await existing.save({ session });
      });
    } finally {
      await session.endSession();
    }

    const fresh = await Purchase.findById(id).lean();
    return fresh;
  },

  async deleteIntoDB(id: string, tenantId: string, user: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid purchase id");
    }

    const existing = await Purchase.findOne({ _id: id, tenantId });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");

    const linesForStock = existing.items.map((i) => ({
      productId: i.productId as Types.ObjectId,
      qty: i.qty,
    }));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (existing.stockAdded) {
          await reverseStock(session, tenantId, linesForStock);
        }
        existing.isDeleted = true;
        existing.updatedBy = user?.objectId;
        await existing.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return { id: existing._id };
  },
};
