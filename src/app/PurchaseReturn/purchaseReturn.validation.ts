import { z } from "zod";

const lineItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  taxPct: z.coerce.number().min(0).max(100).optional(),
});

export const createPurchaseReturnSchema = z.object({
  body: z.object({
    reference: z.string().min(1),
    supplierName: z.string().min(1),
    returnDate: z.string().min(1),
    refundDueDate: z.string().optional().nullable(),
    items: z.array(lineItemSchema).min(1),
    orderTax: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    shipping: z.coerce.number().min(0).optional(),
    paid: z.coerce.number().min(0).optional(),
    returnStatus: z.enum(["pending", "received"]),
    paymentStatus: z.enum(["unpaid", "paid"]).optional(),
    notes: z.string().optional(),
  }),
});

export const updatePurchaseReturnSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reference: z.string().min(1).optional(),
    supplierName: z.string().min(1).optional(),
    returnDate: z.string().optional(),
    refundDueDate: z.string().optional().nullable(),
    items: z.array(lineItemSchema).min(1).optional(),
    orderTax: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    shipping: z.coerce.number().min(0).optional(),
    paid: z.coerce.number().min(0).optional(),
    returnStatus: z.enum(["pending", "received"]).optional(),
    paymentStatus: z.enum(["unpaid", "paid"]).optional(),
    notes: z.string().optional(),
  }),
});

export const purchaseReturnIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const getPurchaseReturnListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    search: z.string().optional(),
    returnStatus: z.enum(["all", "pending", "received"]).optional(),
    paymentStatus: z.enum(["all", "paid", "unpaid", "overdue"]).optional(),
    since: z.string().optional(),
    supplier: z.string().optional(),
  }),
});
