import { z } from "zod";

export const createSupplierValidation = z.object({
  body: z.object({
    name: z.string().min(1, "Supplier name is required"),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    phone: z
      .union([z.string().regex(/^\+?[0-9]{7,15}$/), z.literal("")])
      .optional(),
    address: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});

export const updateSupplierValidation = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    phone: z
      .union([z.string().regex(/^\+?[0-9]{7,15}$/), z.literal("")])
      .optional(),
    address: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  }),
});
