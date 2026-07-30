import type { Model } from "mongoose";
import { Types } from "mongoose";

export type TSalesReturnStatus = "pending" | "received";
export type TPaymentStatus = "unpaid" | "paid";

export type TSalesReturnLine = {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  imageUrl: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxPct: number;
  lineSubtotal: number;
};

export type TSalesReturn = {
  tenantId: string;
  returnNo: string;
  reference: string;
  customerName: string;
  returnDate: Date;
  refundDueDate?: Date;
  items: TSalesReturnLine[];
  orderTax: number;
  discount: number;
  shipping: number;
  linesSubTotal: number;
  totalAmount: number;
  paid: number;
  returnStatus: TSalesReturnStatus;
  paymentStatus: TPaymentStatus;
  notes?: string;
  stockRestored: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type SalesReturnModel = Model<TSalesReturn>;
