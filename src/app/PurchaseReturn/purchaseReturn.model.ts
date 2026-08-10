import { Schema, model } from "mongoose";
import { PurchaseReturnModel, TPurchaseReturn } from "./purchaseReturn.interface";

const LineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxPct: { type: Number, default: 0, min: 0, max: 100 },
    lineSubtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseReturnSchema = new Schema<TPurchaseReturn, PurchaseReturnModel>(
  {
    tenantId: { type: String, required: true, index: true },
    returnNo: { type: String, required: true },
    reference: { type: String, required: true, trim: true },
    supplierName: { type: String, required: true, trim: true },
    returnDate: { type: Date, required: true },
    refundDueDate: { type: Date },

    items: {
      type: [LineSchema],
      required: true,
      validate: [(v: unknown[]) => v.length > 0, "At least one line"],
    },

    orderTax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    linesSubTotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: true, min: 0 },

    returnStatus: { type: String, enum: ["pending", "received"], default: "pending" },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },

    notes: { type: String, default: "" },
    stockDeducted: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

PurchaseReturnSchema.index({ tenantId: 1, returnNo: 1 }, { unique: true });

PurchaseReturnSchema.pre("find", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
PurchaseReturnSchema.pre("findOne", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const PurchaseReturn = model<TPurchaseReturn, PurchaseReturnModel>(
  "PurchaseReturn",
  PurchaseReturnSchema
);
