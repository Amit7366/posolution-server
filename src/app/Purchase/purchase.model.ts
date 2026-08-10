import { Schema, model } from "mongoose";
import { PurchaseModel, TPurchase } from "./purchase.interface";

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

const PurchaseSchema = new Schema<TPurchase, PurchaseModel>(
  {
    tenantId: { type: String, required: true, index: true },
    purchaseNo: { type: String, required: true },

    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    supplierEmail: { type: String, default: "" },
    supplierPhone: { type: String, default: "" },
    supplierAddress: { type: String, default: "" },

    title: { type: String, default: "Purchase" },

    items: {
      type: [ItemSchema],
      required: true,
      validate: [(v: unknown[]) => v.length > 0, "At least one line item"],
    },

    subTotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0 },
    vatPercent: { type: Number, default: 0, min: 0, max: 100 },
    vatAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    dueDate: { type: Date, required: true },
    hold: { type: Boolean, default: false },

    notes: { type: String, default: "" },
    paymentType: {
      type: String,
      enum: ["cash", "card", "bkash", "nagad", "other"],
      default: "cash",
    },
    stockAdded: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PurchaseSchema.index({ tenantId: 1, purchaseNo: 1 }, { unique: true });

PurchaseSchema.pre("find", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
PurchaseSchema.pre("findOne", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const Purchase = model<TPurchase, PurchaseModel>("Purchase", PurchaseSchema);
