import httpStatus from "http-status";
import { Types } from "mongoose";
import { Customer } from "./customer.model";
import { TCustomer } from "./customer.interface";
import { Invoice } from "../Invoice/invoice.model";
import AppError from "../errors/AppError";

type TListOptions = {
  search?: string;
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
};

function normalizePhone(phone?: string) {
  return String(phone ?? "").trim();
}

export const CustomerService = {
  async createIntoDB(payload: Partial<TCustomer>, user: any, tenantId: string) {
    const name = String(payload.name ?? "").trim();
    if (!name) throw new AppError(httpStatus.BAD_REQUEST, "Customer name is required");

    const phone = normalizePhone(payload.phone);

    try {
      const doc = await Customer.create({
        tenantId,
        name,
        phone,
        email: String(payload.email ?? "").trim(),
        address: String(payload.address ?? "").trim(),
        status: payload.status ?? "active",
        createdBy: user?.objectId,
      });
      return doc;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new AppError(
          httpStatus.CONFLICT,
          "A customer with this phone already exists for your account"
        );
      }
      throw err;
    }
  },

  async getAllFromDB(tenantId: string, opts: TListOptions) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(opts.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { tenantId };

    if (opts.status) filter.status = opts.status;

    if (opts.search) {
      filter.$or = [
        { name: { $regex: opts.search, $options: "i" } },
        { phone: { $regex: opts.search, $options: "i" } },
        { email: { $regex: opts.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);

    return { meta: { page, limit, total }, data };
  },

  async getSingleFromDB(id: string, tenantId: string) {
    const doc = await Customer.findOne({ _id: id, tenantId });
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
    return doc;
  },

  async updateIntoDB(id: string, tenantId: string, payload: Partial<TCustomer>, user: any) {
    const { tenantId: _t, ...rest } = payload as Partial<TCustomer> & { tenantId?: string };
    const body: Record<string, unknown> = { ...rest, updatedBy: user?.objectId };
    if (body.name != null) body.name = String(body.name).trim();
    if (body.phone != null) body.phone = normalizePhone(body.phone as string);
    if (body.email != null) body.email = String(body.email).trim();
    if (body.address != null) body.address = String(body.address).trim();

    try {
      const doc = await Customer.findOneAndUpdate({ _id: id, tenantId }, body, { new: true });
      if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
      return doc;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new AppError(
          httpStatus.CONFLICT,
          "A customer with this phone already exists for your account"
        );
      }
      throw err;
    }
  },

  async deleteIntoDB(id: string, tenantId: string, user: any) {
    const doc = await Customer.findOneAndUpdate(
      { _id: id, tenantId },
      { isDeleted: true, status: "inactive", updatedBy: user?.objectId },
      { new: true }
    );
    if (!doc) throw new AppError(httpStatus.NOT_FOUND, "Customer not found");
    return doc;
  },

  async getSummaryFromDB(id: string, tenantId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid customer id");
    }

    const customer = await Customer.findOne({ _id: id, tenantId }).lean();
    if (!customer) throw new AppError(httpStatus.NOT_FOUND, "Customer not found");

    const customerOid = new Types.ObjectId(id);
    const name = String(customer.name ?? "").trim();
    const phone = String(customer.phone ?? "").trim();

    const orMatch: Record<string, unknown>[] = [{ customerId: customerOid }];
    if (name) {
      orMatch.push({
        $and: [
          {
            $or: [{ customerId: null }, { customerId: { $exists: false } }],
          },
          {
            customerName: {
              $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              $options: "i",
            },
          },
        ],
      });
    }
    if (phone) {
      orMatch.push({
        $and: [
          {
            $or: [{ customerId: null }, { customerId: { $exists: false } }],
          },
          { customerPhone: phone },
        ],
      });
    }

    const [agg] = await Invoice.aggregate<{
      invoiceCount: number;
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
          $or: orMatch,
        },
      },
      {
        $group: {
          _id: null,
          invoiceCount: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
          totalPurchase: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paid" },
          totalDue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "unpaid"] },
                    { $ne: ["$hold", true] },
                  ],
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
      customer,
      stats: {
        invoiceCount: agg?.invoiceCount ?? 0,
        paidCount: agg?.paidCount ?? 0,
        unpaidCount: agg?.unpaidCount ?? 0,
        totalPurchase: round(agg?.totalPurchase ?? 0),
        totalPaid: round(agg?.totalPaid ?? 0),
        totalDue: round(agg?.totalDue ?? 0),
        lastPurchaseAt: agg?.lastPurchaseAt
          ? new Date(agg.lastPurchaseAt).toISOString()
          : null,
      },
    };
  },
};
