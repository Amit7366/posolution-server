import { z } from "zod";

const statusEnum = z.enum(["active", "inactive"]);

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Customer name is required"),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    status: statusEnum.optional(),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    status: statusEnum.optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const customerIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const getCustomerListQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: statusEnum.optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(200).optional(),
  }),
});
