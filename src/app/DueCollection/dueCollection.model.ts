import { Schema, model } from "mongoose";
import { DueCollectionModel, TDueCollection } from "./dueCollection.interface";

const DueCollectionSchema = new Schema<TDueCollection, DueCollectionModel>(
  {
    tenantId: { type: String, required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentType: {
      type: String,
      enum: ["cash", "card", "bkash", "nagad", "other"],
      default: "cash",
    },
    note: { type: String, default: "" },
    collectedAt: { type: Date, required: true, default: () => new Date() },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DueCollectionSchema.index({ tenantId: 1, invoiceId: 1, collectedAt: -1 });

DueCollectionSchema.pre("find", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
DueCollectionSchema.pre("findOne", function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const DueCollection = model<TDueCollection, DueCollectionModel>(
  "DueCollection",
  DueCollectionSchema
);
