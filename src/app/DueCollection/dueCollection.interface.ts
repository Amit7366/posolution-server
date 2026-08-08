import type { Model } from "mongoose";
import { Types } from "mongoose";
import type { TPaymentType } from "../Invoice/invoice.interface";

export type TDueCollection = {
  tenantId: string;
  invoiceId: Types.ObjectId;
  amount: number;
  paymentType: TPaymentType;
  note?: string;
  collectedAt: Date;
  collectedBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type DueCollectionModel = Model<TDueCollection>;
