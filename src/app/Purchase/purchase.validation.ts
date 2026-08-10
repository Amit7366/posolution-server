import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
});

export const createPurchaseSchema = z.object({
  body: z.object({
    supplierId: z.string().min(1, "Supplier is required"),
    supplierName: z.string().min(1, "Supplier name is required"),
    supplierEmail: z.string().optional(),
    supplierPhone: z.string().optional(),
    supplierAddress: z.string().optional(),
    title: z.string().optional(),
    items: z.array(lineItemSchema).min(1, "At least one line item"),
    vatPercent: z.coerce.number().min(0).max(100).optional(),
    paid: z.coerce.number().min(0).optional(),
    status: z.enum(["unpaid", "paid"]).optional(),
    dueDate: z.string().min(1),
    hold: z.coerce.boolean().optional(),
    notes: z.string().optional(),
    paymentType: z.enum(["cash", "card", "bkash", "nagad", "other"]).optional(),
  }),
});

export const updatePurchaseSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    supplierId: z.string().min(1).optional(),
    supplierName: z.string().min(1).optional(),
    supplierEmail: z.string().optional(),
    supplierPhone: z.string().optional(),
    supplierAddress: z.string().optional(),
    title: z.string().optional(),
    items: z.array(lineItemSchema).min(1).optional(),
    vatPercent: z.coerce.number().min(0).max(100).optional(),
    paid: z.coerce.number().min(0).optional(),
    status: z.enum(["unpaid", "paid"]).optional(),
    dueDate: z.string().optional(),
    hold: z.coerce.boolean().optional(),
    notes: z.string().optional(),
    paymentType: z.enum(["cash", "card", "bkash", "nagad", "other"]).optional(),
  }),
});

export const payDueSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    amount: z.coerce.number().positive(),
    paymentType: z.enum(["cash", "card", "bkash", "nagad", "other"]).optional(),
    note: z.string().optional(),
  }),
});

export const purchaseIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const getPurchaseListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    search: z.string().optional(),
    status: z.enum(["all", "paid", "unpaid", "overdue", "due"]).optional(),
    since: z.string().optional(),
    supplier: z.string().optional(),
    supplierId: z.string().optional(),
  }),
});
