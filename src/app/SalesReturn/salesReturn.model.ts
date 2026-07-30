import { Schema, model } from "mongoose";
import { SalesReturnModel, TSalesReturn } from "./salesReturn.interface";

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

const SalesReturnSchema = new Schema<TSalesReturn, SalesReturnModel>(
  {
    tenantId: { type: String, required: true, index: true },
    returnNo: { type: String, required: true },
    reference: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
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
    stockRestored: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SalesReturnSchema.index({ tenantId: 1, returnNo: 1 }, { unique: true });

SalesReturnSchema.pre("find", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
SalesReturnSchema.pre("findOne", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const SalesReturn = model<TSalesReturn, SalesReturnModel>("SalesReturn", SalesReturnSchema);
