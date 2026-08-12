import { z } from "zod";

const partySchema = z
  .object({
    name: z.string().optional(),
    address: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .optional();

const lineItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    fromParty: partySchema,
    clientSaleId: z.string().min(1).max(80).optional(),
    customerId: z.string().optional(),
    customerName: z.string().min(1, "Customer name is required"),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    title: z.string().optional(),
    items: z.array(lineItemSchema).min(1, "At least one line item"),
    vatPercent: z.coerce.number().min(0).max(100).optional(),
    paid: z.coerce.number().min(0).optional(),
    status: z.enum(["unpaid", "paid"]),
    dueDate: z.string().min(1),
    hold: z.coerce.boolean().optional(),
    notes: z.string().optional(),
    customerNote: z.string().optional(),
    paymentType: z.enum(["cash", "card", "bkash", "nagad", "other"]).optional(),
    cashAmount: z.coerce.number().min(0).optional(),
    changeAmount: z.coerce.number().min(0).optional(),
  }),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    fromParty: partySchema,
    customerId: z.string().optional(),
    customerName: z.string().min(1).optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    title: z.string().optional(),
    items: z.array(lineItemSchema).min(1).optional(),
    vatPercent: z.coerce.number().min(0).max(100).optional(),
    paid: z.coerce.number().min(0).optional(),
    status: z.enum(["unpaid", "paid"]).optional(),
    dueDate: z.string().optional(),
    hold: z.coerce.boolean().optional(),
    notes: z.string().optional(),
    customerNote: z.string().optional(),
    paymentType: z.enum(["cash", "card", "bkash", "nagad", "other"]).optional(),
    cashAmount: z.coerce.number().min(0).optional(),
    changeAmount: z.coerce.number().min(0).optional(),
  }),
});

export const collectDueSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    amount: z.coerce.number().positive(),
    paymentType: z.enum(["cash", "card", "bkash", "nagad", "other"]).optional(),
    note: z.string().optional(),
  }),
});

export const invoiceIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const getInvoiceListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
    search: z.string().optional(),
    status: z.enum(["all", "paid", "unpaid", "overdue", "due"]).optional(),
    since: z.string().optional(),
    customer: z.string().optional(),
    customerId: z.string().optional(),
  }),
});
