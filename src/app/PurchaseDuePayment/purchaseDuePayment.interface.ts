import type { Model } from "mongoose";
import { Types } from "mongoose";
import type { TPaymentType } from "../Purchase/purchase.interface";

export type TPurchaseDuePayment = {
  tenantId: string;
  purchaseId: Types.ObjectId;
  amount: number;
  paymentType: TPaymentType;
  note?: string;
  paidAt: Date;
  paidBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type PurchaseDuePaymentModel = Model<TPurchaseDuePayment>;
