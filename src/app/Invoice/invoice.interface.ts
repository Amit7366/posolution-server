import type { Model } from "mongoose";
import { Types } from "mongoose";

export type TInvoiceStatus = "unpaid" | "paid";
export type TPaymentType = "cash" | "card" | "bkash" | "nagad" | "other";

export type TInvoiceItem = {
  productId: Types.ObjectId;
  productName: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
};

export type TInvoiceParty = {
  name: string;
  address: string;
  email: string;
  phone: string;
};

export type TInvoice = {
  tenantId: string;
  invoiceNo: string;
  /** Client-generated UUID for offline sync idempotency */
  clientSaleId?: string;
  fromParty: TInvoiceParty;
  customerId?: Types.ObjectId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  title: string;
  items: TInvoiceItem[];
  subTotal: number;
  discountTotal: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  paid: number;
  status: TInvoiceStatus;
  dueDate: Date;
  /** Parks sale without stock deduction */
  hold: boolean;
  notes?: string;
  customerNote?: string;
  paymentType?: TPaymentType;
  cashAmount?: number;
  changeAmount?: number;
  stockDeducted: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type InvoiceModel = Model<TInvoice>;
