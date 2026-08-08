import httpStatus from "http-status";
import mongoose, { ClientSession, Types } from "mongoose";
import AppError from "../errors/AppError";
import { Product } from "../Product/product.model";
import { DueCollection } from "../DueCollection/dueCollection.model";
import { Invoice } from "./invoice.model";
import { TInvoiceItem, TInvoiceParty, TInvoiceStatus, TPaymentType } from "./invoice.interface";
import { generateNextInvoiceNo } from "./invoice.utils";

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
  const items: TInvoiceItem[] = [];
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

  return { items, subTotal, discountTotal, vatAmount: 0, totalAmount: 0 };
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

async function deductStock(
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
      throw new AppError(httpStatus.BAD_REQUEST, "Product missing during stock update");
    }
    if (doc.quantity < qty) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for "${doc.name}" (need ${qty}, have ${doc.quantity})`
      );
    }
    doc.quantity -= qty;
    await doc.save({ session });
  }
}

async function restoreStock(
  session: ClientSession,
  tenantId: string,
  lines: { productId: Types.ObjectId; qty: number }[]
) {
  for (const { productId, qty } of lines) {
    await Product.findOneAndUpdate(
      { _id: productId, tenantId, isDeleted: { $ne: true } },
      { $inc: { quantity: qty } },
      { session }
    );
  }
}

function parseCustomerId(raw?: string | null): Types.ObjectId | undefined {
  if (!raw || !String(raw).trim()) return undefined;
  if (!Types.ObjectId.isValid(raw)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid customer id");
  }
  return new Types.ObjectId(raw);
}

type CreatePayload = {
  fromParty?: Partial<TInvoiceParty>;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  title?: string;
  items: LineInput[];
  vatPercent?: number;
  paid?: number;
  status: TInvoiceStatus;
  dueDate: string | Date;
  hold?: boolean;
  notes?: string;
  customerNote?: string;
  paymentType?: TPaymentType;
  cashAmount?: number;
  changeAmount?: number;
};

export const InvoiceService = {
  async createIntoDB(payload: CreatePayload, user: any, tenantId: string) {
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

    let status: TInvoiceStatus = "unpaid";
    if (paid >= totalAmount) status = "paid";

    const hold = Boolean(payload.hold);
    const shouldDeduct = !hold;

    const paymentType: TPaymentType = payload.paymentType ?? "cash";
    const cashAmount = roundMoney(
      Math.max(0, Number(payload.cashAmount ?? (status === "paid" ? totalAmount : paid)))
    );
    const changeAmount = roundMoney(
      Math.max(
        0,
        Number(
          payload.changeAmount ??
            (paymentType === "cash" && status === "paid" ? Math.max(0, cashAmount - totalAmount) : 0)
        )
      )
    );

    const fromParty: TInvoiceParty = {
      name: payload.fromParty?.name ?? "",
      address: payload.fromParty?.address ?? "",
      email: payload.fromParty?.email ?? "",
      phone: payload.fromParty?.phone ?? "",
    };

    const invoiceNo = await generateNextInvoiceNo(tenantId);
    const dueDate = new Date(payload.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid due date");
    }

    const customerId = parseCustomerId(payload.customerId);
    const linesForStock = built.items.map((i) => ({ productId: i.productId, qty: i.qty }));

    const commonFields = {
      tenantId,
      invoiceNo,
      fromParty,
      ...(customerId ? { customerId } : {}),
      customerName: payload.customerName.trim(),
      customerEmail: payload.customerEmail?.trim() ?? "",
      customerPhone: payload.customerPhone?.trim() ?? "",
      customerAddress: payload.customerAddress?.trim() ?? "",
      title: payload.title?.trim() || "Sales invoice",
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
      customerNote: payload.customerNote?.trim() ?? "",
      paymentType,
      cashAmount,
      changeAmount,
      createdBy: user?.objectId,
    };

    if (shouldDeduct) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await deductStock(session, tenantId, linesForStock);
          await Invoice.create(
            [
              {
                ...commonFields,
                stockDeducted: true,
              },
            ],
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
      const doc = await Invoice.findOne({ tenantId, invoiceNo }).lean();
      return doc;
    }

    const doc = await Invoice.create({
      ...commonFields,
      stockDeducted: false,
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
      customer?: string;
      customerId?: string;
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
        { invoiceNo: rx },
        { customerName: rx },
        { customerEmail: rx },
        { customerPhone: rx },
        { title: rx },
      ];
    }

    if (opts.since) {
      const d = new Date(opts.since);
      if (!Number.isNaN(d.getTime())) {
        filter.createdAt = { $gte: d };
      }
    }

    if (opts.customerId?.trim()) {
      if (!Types.ObjectId.isValid(opts.customerId)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid customer id");
      }
      filter.customerId = new Types.ObjectId(opts.customerId);
    } else if (opts.customer?.trim()) {
      const rx = new RegExp(opts.customer!.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.customerName = rx;
    }

    const [data, total] = await Promise.all([
      Invoice.find(filter).sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  async getSingleFromDB(id: string, tenantId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid invoice id");
    }
    const doc = await Invoice.findOne({ _id: id, tenantId }).lean();
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
    return doc;
  },

  async collectDueIntoDB(
    id: string,
    tenantId: string,
    payload: { amount: number; paymentType?: TPaymentType; note?: string },
    user: any
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid invoice id");
    }

    const amount = roundMoney(Number(payload.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "Collection amount must be greater than 0");
    }

    const session = await mongoose.startSession();
    let result: Record<string, unknown> | null = null;

    try {
      await session.withTransaction(async () => {
        const existing = await Invoice.findOne({ _id: id, tenantId }).session(session);
        if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
        if (existing.hold) {
          throw new AppError(httpStatus.BAD_REQUEST, "Cannot collect on a held sale — confirm it first");
        }

        const amountDue = roundMoney(existing.totalAmount - existing.paid);
        if (amountDue <= 0) {
          throw new AppError(httpStatus.BAD_REQUEST, "Invoice has no outstanding due");
        }
        if (amount > amountDue) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Collection amount exceeds due (${amountDue})`
          );
        }

        const paymentType: TPaymentType = payload.paymentType ?? "cash";
        const nextPaid = roundMoney(existing.paid + amount);
        const nextStatus: TInvoiceStatus = nextPaid >= existing.totalAmount ? "paid" : "unpaid";

        await DueCollection.create(
          [
            {
              tenantId,
              invoiceId: existing._id,
              amount,
              paymentType,
              note: payload.note?.trim() ?? "",
              collectedAt: new Date(),
              collectedBy: user?.objectId,
            },
          ],
          { session }
        );

        existing.paid = nextPaid;
        existing.status = nextStatus;
        existing.updatedBy = user?.objectId;
        await existing.save({ session });

        result = {
          invoice: existing.toObject(),
          collection: {
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

  async getCollectionsFromDB(invoiceId: string, tenantId: string) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid invoice id");
    }
    const inv = await Invoice.findOne({ _id: invoiceId, tenantId }).select("_id").lean();
    if (!inv) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

    const data = await DueCollection.find({ tenantId, invoiceId })
      .sort({ collectedAt: -1 })
      .lean();
    return data;
  },

  async updateIntoDB(id: string, tenantId: string, payload: Partial<CreatePayload> & { status?: TInvoiceStatus }, user: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid invoice id");
    }

    const existing = await Invoice.findOne({ _id: id, tenantId });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

    let nextItems = existing.items;
    let subTotal = existing.subTotal;
    let discountTotal = existing.discountTotal;
    let vatAmount = existing.vatAmount;
    let totalAmount = existing.totalAmount;

    if (payload.items?.length) {
      if (existing.stockDeducted) {
        throw new AppError(httpStatus.BAD_REQUEST, "Cannot change line items after stock was deducted");
      }
      const built = await buildLineItems(tenantId, payload.items);
      const v = applyVat(built.subTotal, built.discountTotal, payload.vatPercent ?? existing.vatPercent);
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

    let status: TInvoiceStatus =
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

    const nextFrom = payload.fromParty
      ? {
          name: payload.fromParty.name ?? existing.fromParty.name,
          address: payload.fromParty.address ?? existing.fromParty.address,
          email: payload.fromParty.email ?? existing.fromParty.email,
          phone: payload.fromParty.phone ?? existing.fromParty.phone,
        }
      : existing.fromParty;

    let stockDeducted = existing.stockDeducted;
    const customerId =
      payload.customerId !== undefined ? parseCustomerId(payload.customerId) : existing.customerId;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (shouldHaveStock && !stockDeducted) {
          await deductStock(session, tenantId, linesForStock);
          stockDeducted = true;
        } else if (!shouldHaveStock && stockDeducted) {
          await restoreStock(session, tenantId, linesForStock);
          stockDeducted = false;
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
          fromParty: nextFrom,
          ...(customerId !== undefined ? { customerId: customerId ?? null } : {}),
          customerName: payload.customerName?.trim() ?? existing.customerName,
          customerEmail: payload.customerEmail?.trim() ?? existing.customerEmail,
          customerPhone: payload.customerPhone?.trim() ?? existing.customerPhone,
          customerAddress: payload.customerAddress?.trim() ?? existing.customerAddress,
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
          stockDeducted,
          updatedBy: user?.objectId,
        });

        await existing.save({ session });
      });
    } finally {
      await session.endSession();
    }

    const fresh = await Invoice.findById(id).lean();
    return fresh;
  },

  async deleteIntoDB(id: string, tenantId: string, user: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid invoice id");
    }

    const existing = await Invoice.findOne({ _id: id, tenantId });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

    const linesForStock = existing.items.map((i) => ({
      productId: i.productId as Types.ObjectId,
      qty: i.qty,
    }));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (existing.stockDeducted) {
          await restoreStock(session, tenantId, linesForStock);
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
