import { Schema, model } from "mongoose";
import { InvoiceModel, TInvoice } from "./invoice.interface";

const PartySchema = new Schema(
  {
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const ItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<TInvoice, InvoiceModel>(
  {
    tenantId: { type: String, required: true, index: true },
    invoiceNo: { type: String, required: true },

    fromParty: { type: PartySchema, default: () => ({}) },

    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    customerAddress: { type: String, default: "" },

    title: { type: String, default: "Sales invoice" },

    items: { type: [ItemSchema], required: true, validate: [(v: unknown[]) => v.length > 0, "At least one line item"] },

    subTotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0 },
    vatPercent: { type: Number, default: 0, min: 0, max: 100 },
    vatAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    dueDate: { type: Date, required: true },

    notes: { type: String, default: "" },
    stockDeducted: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

InvoiceSchema.index({ tenantId: 1, invoiceNo: 1 }, { unique: true });

InvoiceSchema.pre("find", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
InvoiceSchema.pre("findOne", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const Invoice = model<TInvoice, InvoiceModel>("Invoice", InvoiceSchema);
