import { Schema, model } from "mongoose";
import { CustomerModel, TCustomer } from "./customer.interface";

const CustomerSchema = new Schema<TCustomer, CustomerModel>(
  {
    tenantId: { type: String, required: true, index: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isDeleted: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Tenant-scoped uniqueness only — same phone allowed across different tenants
CustomerSchema.index(
  { tenantId: 1, phone: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { phone: { $type: "string", $gt: "" }, isDeleted: { $ne: true } },
  }
);

CustomerSchema.pre("find", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});
CustomerSchema.pre("findOne", function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});
CustomerSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export const Customer = model<TCustomer, CustomerModel>("Customer", CustomerSchema);
