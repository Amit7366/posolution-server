// supplier.service.ts
import { Types } from "mongoose";
import { Supplier } from "./supplier.model";
import { Purchase } from "../Purchase/purchase.model";
import AppError from "../errors/AppError";
import httpStatus from "http-status";
import { generateSupplierId } from "./supplier.utils";

const createSupplierIntoDB = async (payload: any, user: any, tenantId: string) => {
  const supplierId = await generateSupplierId(tenantId);

  return await Supplier.create({
    supplierId,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    status: payload.status === "inactive" ? "inactive" : "active",
    tenantId,
    createdBy: user.objectId,
  });
};

const getAllSuppliersFromDB = async (
  tenantId: string,
  opts?: { search?: string; status?: string }
) => {
  const filter: Record<string, unknown> = { tenantId };
  if (opts?.status === "active" || opts?.status === "inactive") {
    filter.status = opts.status;
  }
  if (opts?.search?.trim()) {
    const rx = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { supplierId: rx }];
  }
  return await Supplier.find(filter).sort({ createdAt: -1 });
};

const getSupplierFromDB = async (supplierId: string, tenantId: string) => {
  const supplier = await Supplier.findOne({ supplierId, tenantId });
  if (!supplier) throw new AppError(httpStatus.NOT_FOUND, "Supplier not found");
  return supplier;
};

const updateSupplierIntoDB = async (supplierId: string, tenantId: string, payload: any) => {
  const updated = await Supplier.findOneAndUpdate(
    { supplierId, tenantId },
    payload,
    { new: true }
  );

  if (!updated) throw new AppError(httpStatus.NOT_FOUND, "Supplier not found");
  return updated;
};

const deleteSupplierFromDB = async (supplierId: string, tenantId: string) => {
  const deleted = await Supplier.findOneAndDelete({ supplierId, tenantId });
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, "Supplier not found");
  return deleted;
};

const getSummaryFromDB = async (supplierIdParam: string, tenantId: string) => {
  const supplier = await Supplier.findOne({ supplierId: supplierIdParam, tenantId }).lean();
  if (!supplier) throw new AppError(httpStatus.NOT_FOUND, "Supplier not found");

  const supplierOid = supplier._id as Types.ObjectId;

  const [agg] = await Purchase.aggregate<{
    purchaseCount: number;
    paidCount: number;
    unpaidCount: number;
    totalPurchase: number;
    totalPaid: number;
    totalDue: number;
    lastPurchaseAt: Date | null;
  }>([
    {
      $match: {
        tenantId,
        isDeleted: { $ne: true },
        supplierId: supplierOid,
      },
    },
    {
      $group: {
        _id: null,
        purchaseCount: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        unpaidCount: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
        totalPurchase: { $sum: "$totalAmount" },
        totalPaid: { $sum: "$paid" },
        totalDue: {
          $sum: {
            $cond: [
              {
                $and: [{ $eq: ["$status", "unpaid"] }, { $ne: ["$hold", true] }],
              },
              { $max: [{ $subtract: ["$totalAmount", "$paid"] }, 0] },
              0,
            ],
          },
        },
        lastPurchaseAt: { $max: "$createdAt" },
      },
    },
  ]);

  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

  return {
    supplier,
    stats: {
      purchaseCount: agg?.purchaseCount ?? 0,
      paidCount: agg?.paidCount ?? 0,
      unpaidCount: agg?.unpaidCount ?? 0,
      totalPurchase: round(agg?.totalPurchase ?? 0),
      totalPaid: round(agg?.totalPaid ?? 0),
      totalDue: round(agg?.totalDue ?? 0),
      lastPurchaseAt: agg?.lastPurchaseAt ?? null,
    },
  };
};

export const SupplierService = {
  createSupplierIntoDB,
  getAllSuppliersFromDB,
  getSupplierFromDB,
  updateSupplierIntoDB,
  deleteSupplierFromDB,
  getSummaryFromDB,
};
