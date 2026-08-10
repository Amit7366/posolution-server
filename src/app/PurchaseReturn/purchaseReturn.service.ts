import httpStatus from "http-status";
import mongoose, { ClientSession, Types } from "mongoose";
import AppError from "../errors/AppError";
import { Product } from "../Product/product.model";
import { PurchaseReturn } from "./purchaseReturn.model";
import {
  TPurchaseReturnLine,
  TPurchaseReturnStatus,
  TPaymentStatus,
} from "./purchaseReturn.interface";
import { generateNextPurchaseReturnNo } from "./purchaseReturn.utils";

type LineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
  discount?: number;
  taxPct?: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeLineSubtotal(
  unitPrice: number,
  qty: number,
  discount: number,
  taxPct: number
): number {
  const base = unitPrice * qty;
  const afterDiscount = Math.max(0, base - discount);
  const tax = (afterDiscount * taxPct) / 100;
  return roundMoney(Math.max(0, afterDiscount + tax));
}

async function buildLines(tenantId: string, lines: LineInput[]): Promise<TPurchaseReturnLine[]> {
  const items: TPurchaseReturnLine[] = [];

  for (const line of lines) {
    if (!Types.ObjectId.isValid(line.productId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid product id");
    }
    const product = await Product.findOne({
      _id: line.productId,
      tenantId,
      isDeleted: { $ne: true },
    })
      .select("name sku images price")
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
    const taxPct = Math.min(100, Math.max(0, Number(line.taxPct ?? 0)));
    const lineSubtotal = computeLineSubtotal(unitPrice, qty, discount, taxPct);

    const imgs = product.images as string[] | undefined;
    const imageUrl = Array.isArray(imgs) && imgs[0] ? String(imgs[0]) : "";

    items.push({
      productId: new Types.ObjectId(line.productId),
      productName: String(product.name),
      sku: product.sku ? String(product.sku) : "",
      imageUrl,
      qty,
      unitPrice,
      discount,
      taxPct,
      lineSubtotal,
    });
  }

  return items;
}

function computeGrandTotal(
  items: TPurchaseReturnLine[],
  orderTax: number,
  discount: number,
  shipping: number
): { linesSubTotal: number; totalAmount: number } {
  const linesSubTotal = roundMoney(items.reduce((s, it) => s + it.lineSubtotal, 0));
  const ot = roundMoney(Math.max(0, orderTax));
  const d = roundMoney(Math.max(0, discount));
  const sh = roundMoney(Math.max(0, shipping));
  const totalAmount = roundMoney(Math.max(0, linesSubTotal + ot - d + sh));
  return { linesSubTotal, totalAmount };
}

/** Deduct stock when goods are returned to supplier */
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
      throw new AppError(httpStatus.BAD_REQUEST, "Product missing during stock deduct");
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

/** Put stock back when reversing a received purchase return */
async function restoreStock(
  session: ClientSession,
  tenantId: string,
  lines: { productId: Types.ObjectId; qty: number }[]
) {
  for (const { productId, qty } of lines) {
    const r = await Product.findOneAndUpdate(
      { _id: productId, tenantId, isDeleted: { $ne: true } },
      { $inc: { quantity: qty } },
      { session, new: true }
    );
    if (!r) {
      throw new AppError(httpStatus.BAD_REQUEST, "Product missing during stock restore");
    }
  }
}

type CreatePayload = {
  reference: string;
  supplierName: string;
  returnDate: string | Date;
  refundDueDate?: string | Date | null;
  items: LineInput[];
  orderTax?: number;
  discount?: number;
  shipping?: number;
  paid?: number;
  returnStatus: TPurchaseReturnStatus;
  paymentStatus?: TPaymentStatus;
  notes?: string;
};

function resolvePayment(total: number, paid: number, explicit?: TPaymentStatus): TPaymentStatus {
  if (paid >= total && total > 0) return "paid";
  if (explicit === "paid" || explicit === "unpaid") return explicit;
  return "unpaid";
}

export const PurchaseReturnService = {
  async createIntoDB(payload: CreatePayload, user: any, tenantId: string) {
    const items = await buildLines(tenantId, payload.items);
    const orderTax = Number(payload.orderTax ?? 0);
    const discount = Number(payload.discount ?? 0);
    const shipping = Number(payload.shipping ?? 0);
    const { linesSubTotal, totalAmount } = computeGrandTotal(items, orderTax, discount, shipping);

    let paid = roundMoney(Math.max(0, Number(payload.paid ?? 0)));
    const returnStatus: TPurchaseReturnStatus =
      payload.returnStatus === "received" ? "received" : "pending";

    let paymentStatus = resolvePayment(totalAmount, paid, payload.paymentStatus);
    if (paid >= totalAmount) paymentStatus = "paid";

    const returnDate = new Date(payload.returnDate);
    if (Number.isNaN(returnDate.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid return date");
    }

    let refundDueDate: Date | undefined;
    if (payload.refundDueDate) {
      const d = new Date(payload.refundDueDate);
      if (Number.isNaN(d.getTime()))
        throw new AppError(httpStatus.BAD_REQUEST, "Invalid refund due date");
      refundDueDate = d;
    }

    const returnNo = await generateNextPurchaseReturnNo(tenantId);
    const stockLines = items.map((i) => ({ productId: i.productId, qty: i.qty }));

    const common = {
      tenantId,
      returnNo,
      reference: payload.reference.trim(),
      supplierName: payload.supplierName.trim(),
      returnDate,
      refundDueDate,
      items,
      orderTax: roundMoney(Math.max(0, orderTax)),
      discount: roundMoney(Math.max(0, discount)),
      shipping: roundMoney(Math.max(0, shipping)),
      linesSubTotal,
      totalAmount,
      paid,
      returnStatus,
      paymentStatus,
      notes: payload.notes?.trim() ?? "",
      createdBy: user?.objectId,
    };

    if (returnStatus === "received") {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await deductStock(session, tenantId, stockLines);
          await PurchaseReturn.create([{ ...common, stockDeducted: true }], { session });
        });
      } finally {
        await session.endSession();
      }
      return PurchaseReturn.findOne({ tenantId, returnNo }).lean();
    }

    const doc = await PurchaseReturn.create({
      ...common,
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
      returnStatus?: "all" | "pending" | "received";
      paymentStatus?: "all" | "paid" | "unpaid" | "overdue";
      since?: string;
      supplier?: string;
    }
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { tenantId, isDeleted: { $ne: true } };

    if (opts.returnStatus === "pending") filter.returnStatus = "pending";
    else if (opts.returnStatus === "received") filter.returnStatus = "received";

    if (opts.paymentStatus === "paid") filter.paymentStatus = "paid";
    else if (opts.paymentStatus === "unpaid") filter.paymentStatus = "unpaid";
    else if (opts.paymentStatus === "overdue") {
      filter.paymentStatus = "unpaid";
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      filter.refundDueDate = { $lt: startOfToday };
    }

    if (opts.since) {
      const d = new Date(opts.since);
      if (!Number.isNaN(d.getTime())) filter.returnDate = { $gte: d };
    }

    if (opts.supplier?.trim()) {
      const rx = new RegExp(opts.supplier.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.supplierName = rx;
    }

    if (opts.search?.trim()) {
      const rx = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { returnNo: rx },
        { reference: rx },
        { supplierName: rx },
        { "items.productName": rx },
      ];
    }

    const [data, total] = await Promise.all([
      PurchaseReturn.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PurchaseReturn.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total } };
  },

  async getSingleFromDB(id: string, tenantId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid id");
    }
    const doc = await PurchaseReturn.findOne({ _id: id, tenantId }).lean();
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Purchase return not found");
    return doc;
  },

  async updateIntoDB(
    id: string,
    tenantId: string,
    payload: Partial<CreatePayload> & {
      returnStatus?: TPurchaseReturnStatus;
      paymentStatus?: TPaymentStatus;
    },
    user: any
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid id");
    }

    const existing = await PurchaseReturn.findOne({ _id: id, tenantId });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Purchase return not found");

    let items = existing.items;
    let linesSubTotal = existing.linesSubTotal;
    let totalAmount = existing.totalAmount;

    if (payload.items?.length) {
      if (existing.stockDeducted) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Cannot change line items after stock was deducted (received return)"
        );
      }
      items = await buildLines(tenantId, payload.items);
      const ot = payload.orderTax ?? existing.orderTax;
      const disc = payload.discount ?? existing.discount;
      const ship = payload.shipping ?? existing.shipping;
      const comp = computeGrandTotal(items, Number(ot), Number(disc), Number(ship));
      linesSubTotal = comp.linesSubTotal;
      totalAmount = comp.totalAmount;
    } else if (
      payload.orderTax != null ||
      payload.discount != null ||
      payload.shipping != null
    ) {
      const comp = computeGrandTotal(
        existing.items as TPurchaseReturnLine[],
        Number(payload.orderTax ?? existing.orderTax),
        Number(payload.discount ?? existing.discount),
        Number(payload.shipping ?? existing.shipping)
      );
      linesSubTotal = comp.linesSubTotal;
      totalAmount = comp.totalAmount;
    }

    let paid = payload.paid != null ? roundMoney(Math.max(0, Number(payload.paid))) : existing.paid;

    let returnStatus: TPurchaseReturnStatus =
      payload.returnStatus === "received" || payload.returnStatus === "pending"
        ? payload.returnStatus
        : existing.returnStatus;

    let paymentStatus: TPaymentStatus = resolvePayment(
      totalAmount,
      paid,
      payload.paymentStatus ?? existing.paymentStatus
    );
    if (paid >= totalAmount) paymentStatus = "paid";

    const stockLines = items.map((i) => ({
      productId: i.productId as Types.ObjectId,
      qty: i.qty,
    }));

    let stockDeducted = existing.stockDeducted;
    const becameReceived = returnStatus === "received" && existing.returnStatus !== "received";
    const becamePending = returnStatus === "pending" && existing.returnStatus === "received";

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (becameReceived && !stockDeducted) {
          await deductStock(session, tenantId, stockLines);
          stockDeducted = true;
        } else if (becamePending && stockDeducted) {
          await restoreStock(session, tenantId, stockLines);
          stockDeducted = false;
        }

        let nextReturnDate = existing.returnDate;
        if (payload.returnDate) {
          const d = new Date(payload.returnDate);
          if (Number.isNaN(d.getTime()))
            throw new AppError(httpStatus.BAD_REQUEST, "Invalid return date");
          nextReturnDate = d;
        }

        let nextRefundDue = existing.refundDueDate;
        if (payload.refundDueDate !== undefined) {
          if (payload.refundDueDate === null || payload.refundDueDate === "") {
            nextRefundDue = undefined;
          } else {
            const d = new Date(payload.refundDueDate);
            if (Number.isNaN(d.getTime()))
              throw new AppError(httpStatus.BAD_REQUEST, "Invalid refund due date");
            nextRefundDue = d;
          }
        }

        existing.set({
          reference: payload.reference?.trim() ?? existing.reference,
          supplierName: payload.supplierName?.trim() ?? existing.supplierName,
          returnDate: nextReturnDate,
          refundDueDate: nextRefundDue,
          items,
          orderTax: roundMoney(Math.max(0, Number(payload.orderTax ?? existing.orderTax))),
          discount: roundMoney(Math.max(0, Number(payload.discount ?? existing.discount))),
          shipping: roundMoney(Math.max(0, Number(payload.shipping ?? existing.shipping))),
          linesSubTotal,
          totalAmount,
          paid,
          returnStatus,
          paymentStatus,
          notes: payload.notes?.trim() ?? existing.notes,
          stockDeducted,
          updatedBy: user?.objectId,
        });

        await existing.save({ session });
      });
    } finally {
      await session.endSession();
    }

    return PurchaseReturn.findById(id).lean();
  },

  async deleteIntoDB(id: string, tenantId: string, user: any) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid id");
    }

    const existing = await PurchaseReturn.findOne({ _id: id, tenantId });
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Purchase return not found");

    const stockLines = existing.items.map((i) => ({
      productId: i.productId as Types.ObjectId,
      qty: i.qty,
    }));

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (existing.stockDeducted) {
          await restoreStock(session, tenantId, stockLines);
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
