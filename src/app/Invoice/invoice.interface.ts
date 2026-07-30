import type { Model } from "mongoose";
import { Types } from "mongoose";

export type TInvoiceStatus = "unpaid" | "paid";

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
  fromParty: TInvoiceParty;
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
  notes?: string;
  stockDeducted: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted?: boolean;
};

export type InvoiceModel = Model<TInvoice>;
