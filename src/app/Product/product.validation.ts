import { z } from "zod";

const statusEnum = z.enum(["active", "inactive"]);
const sellingEnum = z.enum(["single", "variant"]);
const barcodeEnum = z.enum(["CODE128", "EAN13", "UPC", "QR"]);

const objectId = z.string().min(1);

/** Treat "" / null as undefined so optional refs work from JSON forms */
const optionalObjectId = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.string().min(1).optional()
);

/** Drop null/undefined/non-string entries (JSON turns array holes into null) */
const imageUrlList = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}, z.array(z.string()).optional());

export const createProductSchema = z.object({
  body: z.object({
    storeId: optionalObjectId,
    warehouseId: optionalObjectId,

    name: z.string().min(2, "Product name is required"),
    slug: z.string().min(2, "Slug is required"),

    sku: z.string().min(2, "SKU is required"),
    sellingType: sellingEnum.optional(),

    categoryId: optionalObjectId,
    subCategoryId: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().min(1).optional()
    ),

    brandId: objectId.optional(),
    unitId: objectId,

    barcodeSymbology: barcodeEnum.optional(),
    itemBarcode: z.string().optional(),

    quantity: z.coerce.number().min(0, "Quantity must be >= 0"),
    lowStockThreshold: z.coerce.number().min(0).optional(),
    price: z.coerce.number().min(0, "Price must be >= 0"),
    taxType: z.string().optional(),

    images: imageUrlList,

    warrantyId: objectId.optional(),
    manufacturer: z.string().optional(),
    manufacturedDate: z.coerce.date().optional(),
    expiryOn: z.coerce.date().optional(),

    variants: z
      .array(
        z.object({
          attributeId: objectId,
          values: z.array(z.string().min(1)).min(1),
        })
      )
      .optional(),

    description: z.string().optional(),

    status: statusEnum.optional(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    storeId: optionalObjectId,
    warehouseId: optionalObjectId,

    name: z.string().min(2).optional(),
    slug: z.string().min(2).optional(),

    sku: z.string().min(2).optional(),
    sellingType: sellingEnum.optional(),

    categoryId: optionalObjectId,
    subCategoryId: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().min(1).optional()
    ),

    brandId: objectId.optional(),
    unitId: objectId.optional(),

    barcodeSymbology: barcodeEnum.optional(),
    itemBarcode: z.string().optional(),

    quantity: z.coerce.number().min(0).optional(),
    lowStockThreshold: z.coerce.number().min(0).optional(),
    price: z.coerce.number().min(0).optional(),
    taxType: z.string().optional(),

    images: imageUrlList,

    warrantyId: objectId.optional(),
    manufacturer: z.string().optional(),
    manufacturedDate: z.coerce.date().optional(),
    expiryOn: z.coerce.date().optional(),

    variants: z
      .array(
        z.object({
          attributeId: objectId,
          values: z.array(z.string().min(1)).min(1),
        })
      )
      .optional(),

    description: z.string().optional(),

    status: statusEnum.optional(),
    isDeleted: z.boolean().optional(),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const getProductListQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: statusEnum.optional(),

    storeId: z.string().optional(),
    warehouseId: z.string().optional(),
    categoryId: z.string().optional(),
    subCategoryId: z.string().optional(),
    brandId: z.string().optional(),
    unitId: z.string().optional(),
    productId: z.string().optional(),

    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(200).optional(),

    sortBy: z.enum(["createdAt", "name", "price", "expiryOn", "quantity"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),

    /** When true, only products with expiryOn in the past */
    expiredOnly: z.preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return undefined;
        return v === "true" || v === "1" || v === true;
      },
      z.boolean().optional()
    ),

    /** When true, only products where quantity is at or below the per-product threshold or stockThreshold */
    lowStockOnly: z.preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return undefined;
        return v === "true" || v === "1" || v === true;
      },
      z.boolean().optional()
    ),

    /** Used with lowStockOnly when product has no lowStockThreshold (default 10) */
    stockThreshold: z.coerce.number().min(0).max(1_000_000).optional(),
  }),
});
