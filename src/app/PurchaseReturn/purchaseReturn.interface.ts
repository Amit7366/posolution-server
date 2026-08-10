import type { Model } from "mongoose";
import { Types } from "mongoose";

export type TPurchaseReturnStatus = "pending" | "received";
export type TPaymentStatus = "unpaid" | "paid";

export type TPurchaseReturnLine = {
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

export type TPurchaseReturn = {
  tenantId: string;
  returnNo: string;
  reference: string;
  supplierName: string;
  returnDate: Date;
  refundDueDate?: Date;
  items: TPurchaseReturnLine[];
  orderTax: number;
  discount: number;
  shipping: number;
  linesSubTotal: number;
  totalAmount: number;
  paid: number;
  returnStatus: TPurchaseReturnStatus;
  paymentStatus: TPaymentStatus;
  notes?: string;
  stockDeducted: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type PurchaseReturnModel = Model<TPurchaseReturn>;
