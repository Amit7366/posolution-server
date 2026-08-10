import type { Model } from "mongoose";
import { Types } from "mongoose";

export type TPurchaseStatus = "unpaid" | "paid";
export type TPaymentType = "cash" | "card" | "bkash" | "nagad" | "other";

export type TPurchaseItem = {
  productId: Types.ObjectId;
  productName: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type TPurchase = {
  tenantId: string;
  purchaseNo: string;
  supplierId: Types.ObjectId;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  title: string;
  items: TPurchaseItem[];
  subTotal: number;
  discountTotal: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  paid: number;
  status: TPurchaseStatus;
  dueDate: Date;
  /** Parks purchase without stock increase */
  hold: boolean;
  notes?: string;
  paymentType?: TPaymentType;
  stockAdded: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type PurchaseModel = Model<TPurchase>;
