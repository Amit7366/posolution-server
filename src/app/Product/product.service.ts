import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { Product } from "./product.model";
import { Store } from "../Store/store.model";
import { Warehouse } from "../Warehouse/warehouse.model";
import { Category } from "../Category/category.model";
import { Unit } from "../Unit/unit.model";
import { SubCategory } from "../SubCategory/subCategory.model";
import { Brand } from "../Brand/brand.model";
import { Warranty } from "../Warranties/warranty.model";
import { VariantAttribute } from "../VariantAttribute/variantAttribute.model";

// referenced models (must exist)

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

type TListOpts = {
  search?: string;
  status?: "active" | "inactive";

  storeId?: string;
  warehouseId?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  unitId?: string;
  /** Filter list to a single product by Mongo _id */
  productId?: string;

  sortBy?: "createdAt" | "name" | "price" | "expiryOn" | "quantity";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  /** Only products with expiryOn set and in the past */
  expiredOnly?: boolean;
  /** quantity <= lowStockThreshold or <= stockThreshold (default 10) */
  lowStockOnly?: boolean;
  stockThreshold?: number;
};

/** req.query keeps strings; coerce for skip/limit math */
function parsePageLimit(opts: { page?: unknown; limit?: unknown }) {
  const rawPage = Number(opts.page);
  const rawLimit = Number(opts.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  let limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.floor(rawLimit) : 20;
  limit = Math.min(200, limit);
  return { page, limit };
}

export const ProductService = {
  async createIntoDB(payload: any, user: any, tenantId: string) {
    // slug fallback
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name || "");
    if (!payload.name) throw new AppError(httpStatus.BAD_REQUEST, "Product name is required");
    if (!slug) throw new AppError(httpStatus.BAD_REQUEST, "Slug is required");
    if (!payload.sku) throw new AppError(httpStatus.BAD_REQUEST, "SKU is required");

    const unit = await Unit.findOne({ _id: payload.unitId, tenantId });
    if (!unit) throw new AppError(httpStatus.BAD_REQUEST, "Unit not found for this tenant");

    let store = null as InstanceType<typeof Store> | null;
    if (payload.storeId) {
      store = await Store.findOne({ _id: payload.storeId, tenantId });
      if (!store) throw new AppError(httpStatus.BAD_REQUEST, "Store not found for this tenant");
    }

    if (payload.warehouseId) {
      const wh = await Warehouse.findOne({ _id: payload.warehouseId, tenantId });
      if (!wh) throw new AppError(httpStatus.BAD_REQUEST, "Warehouse not found for this tenant");
      if (store && String(wh.get("storeId")) !== String(store._id)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Warehouse does not belong to selected store");
      }
      if (!store && wh.get("storeId")) {
        store = await Store.findOne({ _id: wh.get("storeId"), tenantId });
      }
    }

    let cat = null as InstanceType<typeof Category> | null;
    if (payload.categoryId) {
      cat = await Category.findOne({ _id: payload.categoryId, tenantId });
      if (!cat) throw new AppError(httpStatus.BAD_REQUEST, "Category not found for this tenant");
    }

    // optional refs
    if (payload.subCategoryId) {
      const sub = await SubCategory.findOne({ _id: payload.subCategoryId, tenantId });
      if (!sub) throw new AppError(httpStatus.BAD_REQUEST, "Sub category not found for this tenant");
      if (cat && String(sub.get("categoryId")) !== String(cat._id)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Sub category does not belong to selected category");
      }
    }

    if (payload.brandId) {
      const b = await Brand.findOne({ _id: payload.brandId, tenantId });
      if (!b) throw new AppError(httpStatus.BAD_REQUEST, "Brand not found for this tenant");
    }

    if (payload.warrantyId) {
      const w = await Warranty.findOne({ _id: payload.warrantyId, tenantId });
      if (!w) throw new AppError(httpStatus.BAD_REQUEST, "Warranty not found for this tenant");
    }

    // variants validation (if provided)
    if (payload.variants?.length) {
      const ids = payload.variants.map((v: any) => v.attributeId);
      const found = await VariantAttribute
      .find({ _id: { $in: ids }, tenantId });
      if (found.length !== ids.length) {
        throw new AppError(httpStatus.BAD_REQUEST, "One or more variant attributes not found for this tenant");
      }
    }

    const nameTrim = String(payload.name).trim();
    const nameTaken = await Product.findOne({ tenantId, name: nameTrim }).select("_id").lean();
    if (nameTaken) {
      throw new AppError(httpStatus.CONFLICT, "A product with this name already exists for your account");
    }

    const doc = await Product.create({
      tenantId,

      ...(payload.storeId ? { storeId: payload.storeId } : {}),
      ...(payload.warehouseId ? { warehouseId: payload.warehouseId } : {}),

      name: nameTrim,
      slug,

      sku: payload.sku,
      sellingType: payload.sellingType ?? "single",

      ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
      ...(payload.subCategoryId ? { subCategoryId: payload.subCategoryId } : {}),

      brandId: payload.brandId,
      unitId: payload.unitId,

      barcodeSymbology: payload.barcodeSymbology ?? "CODE128",
      itemBarcode: payload.itemBarcode,

      quantity: payload.quantity,
      ...(payload.lowStockThreshold != null ? { lowStockThreshold: Number(payload.lowStockThreshold) } : {}),
      price: payload.price,
      taxType: payload.taxType,

      images: payload.images ?? [],

      warrantyId: payload.warrantyId,
      manufacturer: payload.manufacturer,
      manufacturedDate: payload.manufacturedDate,
      expiryOn: payload.expiryOn,

      variants: payload.variants ?? [],

      description: payload.description,

      status: payload.status ?? "active",
      createdBy: user?.objectId,
    });

    return doc;
  },

  async getAllFromDB(tenantId: string, opts: TListOpts) {
    const { page, limit } = parsePageLimit(opts);
    const skip = (page - 1) * limit;

    const filter: any = { tenantId };

    if (opts.status) filter.status = opts.status;
    if (opts.storeId) filter.storeId = opts.storeId;
    if (opts.warehouseId) filter.warehouseId = opts.warehouseId;
    if (opts.categoryId) filter.categoryId = opts.categoryId;
    if (opts.subCategoryId) filter.subCategoryId = opts.subCategoryId;
    if (opts.brandId) filter.brandId = opts.brandId;
    if (opts.unitId) filter.unitId = opts.unitId;
    if (opts.productId) filter._id = opts.productId;

    if (opts.search) {
      filter.$or = [
        { name: { $regex: opts.search, $options: "i" } },
        { slug: { $regex: opts.search, $options: "i" } },
        { sku: { $regex: opts.search, $options: "i" } },
      ];
    }

    if (opts.expiredOnly) {
      filter.expiryOn = { $exists: true, $ne: null, $lt: new Date() };
    }

    if (opts.lowStockOnly) {
      const t = opts.stockThreshold;
      const threshold = typeof t === "number" && Number.isFinite(t) && t >= 0 ? t : 10;
      filter.$expr = {
        $lte: ["$quantity", { $ifNull: ["$lowStockThreshold", threshold] }],
      };
    }

    const sortBy = opts.sortBy ?? "createdAt";
    const sortOrder = opts.sortOrder ?? "desc";
    const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [data, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("storeId", "name slug")
        .populate("warehouseId", "name slug storeId")
        .populate("categoryId", "name slug")
        .populate("subCategoryId", "name slug")
        .populate("brandId", "name slug imageUrl")
        .populate("unitId", "name shortName")
        .populate("warrantyId", "name duration period")
        .populate("variants.attributeId", "name values")
        .populate("createdBy", "username email"),
      Product.countDocuments(filter),
    ]);

    return { meta: { page, limit, total }, data };
  },

  async getSingleFromDB(id: string, tenantId: string) {
    const doc = await Product.findOne({ _id: id, tenantId })
      .populate("storeId", "name slug")
      .populate("warehouseId", "name slug storeId")
      .populate("categoryId", "name slug")
      .populate("subCategoryId", "name slug")
      .populate("brandId", "name slug imageUrl")
      .populate("unitId", "name shortName")
      .populate("warrantyId", "name duration period")
      .populate("variants.attributeId", "name values")
      .populate("createdBy", "username email");

    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    return doc;
  },

  async updateIntoDB(id: string, tenantId: string, payload: any, user: any) {
    const updateData: any = { ...payload, updatedBy: user?.objectId };
    delete updateData.tenantId;

    if (payload.name != null) {
      const nameTrim = String(payload.name).trim();
      const nameTaken = await Product.findOne({
        tenantId,
        name: nameTrim,
        _id: { $ne: id },
      })
        .select("_id")
        .lean();
      if (nameTaken) {
        throw new AppError(httpStatus.CONFLICT, "A product with this name already exists for your account");
      }
      updateData.name = nameTrim;
    }

    if (payload.name && !payload.slug) updateData.slug = slugify(updateData.name ?? payload.name);
    if (payload.slug) updateData.slug = slugify(payload.slug);

    const existing = await Product.findOne({ _id: id, tenantId }).select(
      "storeId warehouseId categoryId subCategoryId"
    );
    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Product not found");

    let storeIdEff = payload.storeId ?? existing.storeId?.toString?.();

    if (payload.storeId) {
      const store = await Store.findOne({ _id: payload.storeId, tenantId });
      if (!store) throw new AppError(httpStatus.BAD_REQUEST, "Store not found for this tenant");
      storeIdEff = String(store._id);
    }
    if (payload.warehouseId) {
      const wh = await Warehouse.findOne({ _id: payload.warehouseId, tenantId });
      if (!wh) throw new AppError(httpStatus.BAD_REQUEST, "Warehouse not found for this tenant");
      if (storeIdEff && String(wh.storeId) !== String(storeIdEff)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Warehouse does not belong to selected store");
      }
    }

    if (payload.categoryId) {
      const cat = await Category.findOne({ _id: payload.categoryId, tenantId });
      if (!cat) throw new AppError(httpStatus.BAD_REQUEST, "Category not found for this tenant");
    }
    if (payload.subCategoryId) {
      const sub = await SubCategory.findOne({ _id: payload.subCategoryId, tenantId });
      if (!sub) throw new AppError(httpStatus.BAD_REQUEST, "Sub category not found for this tenant");
      const catId = payload.categoryId ?? existing?.categoryId?.toString?.();
      if (catId && String(sub.categoryId) !== String(catId)) {
        throw new AppError(httpStatus.BAD_REQUEST, "Sub category does not belong to selected category");
      }
    }
    if (payload.brandId) {
      const b = await Brand.findOne({ _id: payload.brandId, tenantId });
      if (!b) throw new AppError(httpStatus.BAD_REQUEST, "Brand not found for this tenant");
    }
    if (payload.unitId) {
      const u = await Unit.findOne({ _id: payload.unitId, tenantId });
      if (!u) throw new AppError(httpStatus.BAD_REQUEST, "Unit not found for this tenant");
    }
    if (payload.warrantyId) {
      const w = await Warranty.findOne({ _id: payload.warrantyId, tenantId });
      if (!w) throw new AppError(httpStatus.BAD_REQUEST, "Warranty not found for this tenant");
    }

    if (payload.variants?.length) {
      const ids = payload.variants.map((v: any) => v.attributeId);
      const found = await VariantAttribute.find({ _id: { $in: ids }, tenantId });
      if (found.length !== ids.length) {
        throw new AppError(httpStatus.BAD_REQUEST, "One or more variant attributes not found for this tenant");
      }
    }

    const doc = await Product.findOneAndUpdate({ _id: id, tenantId }, updateData, { new: true });
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    return doc;
  },

  async deleteIntoDB(id: string, tenantId: string, user: any) {
    const doc = await Product.findOneAndUpdate(
      { _id: id, tenantId },
      { isDeleted: true, status: "inactive", updatedBy: user?.objectId },
      { new: true }
    );

    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    return doc;
  },
};
