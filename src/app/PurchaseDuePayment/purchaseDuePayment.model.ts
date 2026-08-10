import { Schema, model } from "mongoose";
import {
  PurchaseDuePaymentModel,
  TPurchaseDuePayment,
} from "./purchaseDuePayment.interface";

const PurchaseDuePaymentSchema = new Schema<TPurchaseDuePayment, PurchaseDuePaymentModel>(
  {
    tenantId: { type: String, required: true, index: true },
    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    paymentType: {
      type: String,
      enum: ["cash", "card", "bkash", "nagad", "other"],
      default: "cash",
    },
    note: { type: String, default: "" },
    paidAt: { type: Date, required: true, default: () => new Date() },
    paidBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PurchaseDuePaymentSchema.index({ tenantId: 1, purchaseId: 1, paidAt: -1 });

PurchaseDuePaymentSchema.pre("find", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
PurchaseDuePaymentSchema.pre("findOne", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const PurchaseDuePayment = model<TPurchaseDuePayment, PurchaseDuePaymentModel>(
  "PurchaseDuePayment",
  PurchaseDuePaymentSchema
);
