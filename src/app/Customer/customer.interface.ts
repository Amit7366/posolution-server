import { Model, Types } from "mongoose";

export type TCustomerStatus = "active" | "inactive";

export type TCustomer = {
  tenantId: string;
  /** Client-generated UUID for offline sync idempotency */
  clientCustomerId?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: TCustomerStatus;
  isDeleted: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
};

export type CustomerModel = Model<TCustomer>;
