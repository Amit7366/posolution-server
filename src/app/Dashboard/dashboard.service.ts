import mongoose from "mongoose";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { Invoice } from "../Invoice/invoice.model";
import { SalesReturn } from "../SalesReturn/salesReturn.model";
import { Purchase } from "../Purchase/purchase.model";
import { PurchaseReturn } from "../PurchaseReturn/purchaseReturn.model";
import { Product } from "../Product/product.model";
import { Supplier } from "../Supplier/supplier.model";
import { Category } from "../Category/category.model";

const roundMoney = (n: number) => Math.round(n * 100) / 100;

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";
export type ProfitLossPreset = "1D" | "3D" | "7D" | "1M" | "1Y" | "custom";

const tenantInvoices = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true },
});

const tenantReturns = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true },
});

const tenantPurchases = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true },
});

const tenantPurchaseReturns = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true },
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : current < 0 ? -100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** JS getDay(): 0 Sun .. 6 Sat → column index 0 Mon .. 6 Sun */
function dayToCol(getDay: number) {
  return getDay === 0 ? 6 : getDay - 1;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function resolveProfitLossRange(
  preset: ProfitLossPreset,
  fromStr?: string,
  toStr?: string
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (preset === "custom") {
    if (!fromStr || !toStr) {
      throw new AppError(httpStatus.BAD_REQUEST, "Custom range requires from and to dates");
    }
    const from = startOfDay(new Date(fromStr));
    const to = endOfDay(new Date(toStr));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid custom date range");
    }
    if (from > to) {
      throw new AppError(httpStatus.BAD_REQUEST, "`from` must be before `to`");
    }
    return {
      from,
      to,
      label: `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`,
    };
  }

  if (preset === "1D") {
    return { from: todayStart, to: todayEnd, label: "Today" };
  }

  if (preset === "3D") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 2);
    return { from, to: todayEnd, label: "Last 3 days" };
  }

  if (preset === "7D") {
    const from = new Date(todayStart);
    from.setDate(from.getDate() - 6);
    return { from, to: todayEnd, label: "Last 7 days" };
  }

  if (preset === "1M") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: todayEnd, label: "This month" };
  }

  const from = new Date(now.getFullYear(), 0, 1);
  return { from: startOfDay(from), to: todayEnd, label: "This year" };
}

async function buildChartPoints(tenantId: string, range: ChartRange) {
  const now = new Date();

  async function salesByHour(dayStart: Date) {
    return Invoice.aggregate<{ _id: number; sales: number }>([
      { $match: { ...tenantInvoices(tenantId), createdAt: { $gte: dayStart, $lte: now } } },
      { $group: { _id: { $hour: "$createdAt" }, sales: { $sum: "$totalAmount" } } },
    ]);
  }

  async function purchasesByHour(dayStart: Date) {
    return Purchase.aggregate<{ _id: number; purchase: number }>([
      { $match: { ...tenantPurchases(tenantId), createdAt: { $gte: dayStart, $lte: now } } },
      { $group: { _id: { $hour: "$createdAt" }, purchase: { $sum: "$totalAmount" } } },
    ]);
  }

  if (range === "1D") {
    const dayStart = startOfDay(now);
    const [salesAgg, purchaseAgg] = await Promise.all([
      salesByHour(dayStart),
      purchasesByHour(dayStart),
    ]);
    const byHourSales = new Map(salesAgg.map((a) => [a._id, roundMoney(a.sales)]));
    const byHourPurchase = new Map(purchaseAgg.map((a) => [a._id, roundMoney(a.purchase)]));
    const points: { label: string; sales: number; purchase: number }[] = [];
    for (let h = 0; h < 24; h += 2) {
      const sales = roundMoney((byHourSales.get(h) ?? 0) + (byHourSales.get(h + 1) ?? 0));
      const purchase = roundMoney(
        (byHourPurchase.get(h) ?? 0) + (byHourPurchase.get(h + 1) ?? 0)
      );
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const suffix = h < 12 ? "am" : "pm";
      points.push({ label: `${h12} ${suffix}`, sales, purchase });
    }
    return points;
  }

  let start: Date;
  let bucket: "day" | "week" | "month";
  if (range === "1W") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start = startOfDay(start);
    bucket = "day";
  } else if (range === "1M") {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
    start = startOfDay(start);
    bucket = "day";
  } else if (range === "3M") {
    start = new Date(now);
    start.setDate(start.getDate() - 89);
    start = startOfDay(start);
    bucket = "week";
  } else if (range === "6M") {
    start = new Date(now);
    start.setMonth(start.getMonth() - 6);
    start = startOfDay(start);
    bucket = "week";
  } else {
    start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    start = startOfDay(start);
    bucket = "month";
  }

  const formatDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (bucket === "day") {
    const [salesAgg, purchaseAgg] = await Promise.all([
      Invoice.aggregate<{ _id: string; sales: number }>([
        { $match: { ...tenantInvoices(tenantId), createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            sales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Purchase.aggregate<{ _id: string; purchase: number }>([
        { $match: { ...tenantPurchases(tenantId), createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            purchase: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const salesMap = new Map(salesAgg.map((a) => [a._id, roundMoney(a.sales)]));
    const purchaseMap = new Map(purchaseAgg.map((a) => [a._id, roundMoney(a.purchase)]));
    const points: { label: string; sales: number; purchase: number }[] = [];
    const endMs = startOfDay(now).getTime();
    for (let t = start.getTime(); t <= endMs; t += 86400000) {
      const d = new Date(t);
      const key = d.toISOString().slice(0, 10);
      points.push({
        label: formatDay(d),
        sales: salesMap.get(key) ?? 0,
        purchase: purchaseMap.get(key) ?? 0,
      });
    }
    return points;
  }

  if (bucket === "week") {
    const [salesAgg, purchaseAgg] = await Promise.all([
      Invoice.aggregate<{ _id: { y: number; w: number }; sales: number }>([
        { $match: { ...tenantInvoices(tenantId), createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: {
              y: { $isoWeekYear: "$createdAt" },
              w: { $isoWeek: "$createdAt" },
            },
            sales: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.y": 1, "_id.w": 1 } },
      ]),
      Purchase.aggregate<{ _id: { y: number; w: number }; purchase: number }>([
        { $match: { ...tenantPurchases(tenantId), createdAt: { $gte: start, $lte: now } } },
        {
          $group: {
            _id: {
              y: { $isoWeekYear: "$createdAt" },
              w: { $isoWeek: "$createdAt" },
            },
            purchase: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.y": 1, "_id.w": 1 } },
      ]),
    ]);
    const purchaseMap = new Map(
      purchaseAgg.map((a) => [`${a._id.y}-${a._id.w}`, roundMoney(a.purchase)])
    );
    const keys = new Set([
      ...salesAgg.map((a) => `${a._id.y}-${a._id.w}`),
      ...purchaseAgg.map((a) => `${a._id.y}-${a._id.w}`),
    ]);
    const salesMap = new Map(
      salesAgg.map((a) => [`${a._id.y}-${a._id.w}`, roundMoney(a.sales)])
    );
    return [...keys]
      .sort()
      .map((key) => {
        const [, w] = key.split("-");
        return {
          label: `W${w}`,
          sales: salesMap.get(key) ?? 0,
          purchase: purchaseMap.get(key) ?? 0,
        };
      });
  }

  const [salesAgg, purchaseAgg] = await Promise.all([
    Invoice.aggregate<{ _id: string; sales: number }>([
      { $match: { ...tenantInvoices(tenantId), createdAt: { $gte: start, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Purchase.aggregate<{ _id: string; purchase: number }>([
      { $match: { ...tenantPurchases(tenantId), createdAt: { $gte: start, $lte: now } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          purchase: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const salesMap = new Map(salesAgg.map((a) => [a._id, roundMoney(a.sales)]));
  const purchaseMap = new Map(purchaseAgg.map((a) => [a._id, roundMoney(a.purchase)]));
  const keys = [...new Set([...salesMap.keys(), ...purchaseMap.keys()])].sort();
  return keys.map((key) => ({
    label: key,
    sales: salesMap.get(key) ?? 0,
    purchase: purchaseMap.get(key) ?? 0,
  }));
}

async function buildOrderHeatmap(tenantId: string): Promise<number[][]> {
  const rows = 9;
  const cols = 7;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  const start = new Date();
  start.setDate(start.getDate() - 27);
  start.setHours(0, 0, 0, 0);

  const docs = await Invoice.find({
    ...tenantInvoices(tenantId),
    createdAt: { $gte: start },
  })
    .select("createdAt")
    .lean();

  for (const inv of docs as { createdAt?: Date }[]) {
    if (!inv.createdAt) continue;
    const dt = new Date(inv.createdAt);
    const col = dayToCol(dt.getDay());
    const hour = dt.getHours();
    const row = Math.min(rows - 1, Math.floor(hour / 2));
    matrix[row][col] += 1;
  }

  const max = Math.max(1, ...matrix.flat());
  return matrix.map((r) => r.map((v) => Math.min(10, Math.round((v / max) * 10))));
}

export const DashboardService = {
  async getSummary(tenantId: string, chartRange: ChartRange) {
    const now = new Date();
    const sod = startOfDay(now);
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      invoiceAgg,
      outstandingAgg,
      collectedAgg,
      retAgg,
      suppliers,
      products,
      categories,
      invoicesToday,
      invoiceCount,
      chartPoints,
      heatmap,
      topProductsAgg,
      lowStockDocs,
      recentInvoices,
      customerAgg,
      topCustomersAgg,
      monthSales,
      monthSalesPrev,
      monthReturns,
      monthReturnsPrev,
      monthCollected,
      monthCollectedPrev,
      topCatAgg,
      dueInvoiceDocs,
      purchaseAgg,
      purchaseReturnAgg,
      duePurchaseDocs,
    ] = await Promise.all([
      Invoice.aggregate<{ totalSales: number }>([
        { $match: tenantInvoices(tenantId) },
        { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
      ]),
      Invoice.aggregate<{ due: number }>([
        {
          $match: {
            ...tenantInvoices(tenantId),
            status: "unpaid",
            hold: { $ne: true },
          },
        },
        { $group: { _id: null, due: { $sum: { $subtract: ["$totalAmount", "$paid"] } } } },
      ]),
      Invoice.aggregate<{ collected: number }>([
        { $match: tenantInvoices(tenantId) },
        { $group: { _id: null, collected: { $sum: "$paid" } } },
      ]),
      SalesReturn.aggregate<{ totalReturn: number; totalPaid: number }>([
        { $match: tenantReturns(tenantId) },
        {
          $group: {
            _id: null,
            totalReturn: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$paid" },
          },
        },
      ]),
      Supplier.countDocuments({ tenantId }),
      Product.countDocuments({ tenantId, isDeleted: { $ne: true } }),
      Category.countDocuments({ tenantId, isDeleted: { $ne: true } }),
      Invoice.countDocuments({ ...tenantInvoices(tenantId), createdAt: { $gte: sod } }),
      Invoice.countDocuments(tenantInvoices(tenantId)),
      buildChartPoints(tenantId, chartRange),
      buildOrderHeatmap(tenantId),
      Invoice.aggregate<{
        _id: mongoose.Types.ObjectId;
        name: string;
        qtySold: number;
        revenue: number;
        unitPrice: number;
      }>([
        { $match: tenantInvoices(tenantId) },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.productName" },
            qtySold: { $sum: "$items.qty" },
            revenue: { $sum: "$items.lineTotal" },
            unitPrice: { $first: "$items.unitPrice" },
          },
        },
        { $sort: { qtySold: -1 } },
        { $limit: 8 },
      ]),
      Product.find({
        tenantId,
        isDeleted: { $ne: true },
        $expr: {
          $lte: ["$quantity", { $ifNull: ["$lowStockThreshold", 10] }],
        },
      })
        .sort({ quantity: 1 })
        .limit(8)
        .select("name sku quantity images")
        .lean(),
      Invoice.find(tenantInvoices(tenantId))
        .sort({ createdAt: -1 })
        .limit(6)
        .select("invoiceNo customerName items totalAmount paid status dueDate createdAt")
        .lean(),
      Invoice.aggregate<{ once?: number; repeat?: number }>([
        { $match: tenantInvoices(tenantId) },
        {
          $group: {
            _id: { $toLower: { $trim: { input: "$customerName" } } },
            c: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            once: { $sum: { $cond: [{ $eq: ["$c", 1] }, 1, 0] } },
            repeat: { $sum: { $cond: [{ $gt: ["$c", 1] }, 1, 0] } },
          },
        },
      ]),
      Invoice.aggregate<{
        _id: mongoose.Types.ObjectId | string;
        name: string;
        orders: number;
        revenue: number;
      }>([
        { $match: tenantInvoices(tenantId) },
        {
          $group: {
            _id: {
              $cond: [
                { $and: [{ $ne: ["$customerId", null] }, { $ifNull: ["$customerId", false] }] },
                "$customerId",
                { $trim: { input: "$customerName" } },
              ],
            },
            name: { $first: { $trim: { input: "$customerName" } } },
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            as: "cust",
          },
        },
        {
          $addFields: {
            resolvedName: {
              $ifNull: [{ $arrayElemAt: ["$cust.name", 0] }, "$name"],
            },
          },
        },
      ]),
      Invoice.aggregate<{ s: number }>([
        {
          $match: {
            ...tenantInvoices(tenantId),
            createdAt: { $gte: startThisMonth },
          },
        },
        { $group: { _id: null, s: { $sum: "$totalAmount" } } },
      ]),
      Invoice.aggregate<{ s: number }>([
        {
          $match: {
            ...tenantInvoices(tenantId),
            createdAt: { $gte: startLastMonth, $lte: endLastMonth },
          },
        },
        { $group: { _id: null, s: { $sum: "$totalAmount" } } },
      ]),
      SalesReturn.aggregate<{ s: number }>([
        {
          $match: {
            ...tenantReturns(tenantId),
            createdAt: { $gte: startThisMonth },
          },
        },
        { $group: { _id: null, s: { $sum: "$totalAmount" } } },
      ]),
      SalesReturn.aggregate<{ s: number }>([
        {
          $match: {
            ...tenantReturns(tenantId),
            createdAt: { $gte: startLastMonth, $lte: endLastMonth },
          },
        },
        { $group: { _id: null, s: { $sum: "$totalAmount" } } },
      ]),
      Invoice.aggregate<{ s: number }>([
        {
          $match: {
            ...tenantInvoices(tenantId),
            createdAt: { $gte: startThisMonth },
          },
        },
        { $group: { _id: null, s: { $sum: "$paid" } } },
      ]),
      Invoice.aggregate<{ s: number }>([
        {
          $match: {
            ...tenantInvoices(tenantId),
            createdAt: { $gte: startLastMonth, $lte: endLastMonth },
          },
        },
        { $group: { _id: null, s: { $sum: "$paid" } } },
      ]),
      Invoice.aggregate<{
        _id: mongoose.Types.ObjectId | null;
        name: string;
        revenue: number;
      }>([
        { $match: tenantInvoices(tenantId) },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "p",
          },
        },
        { $unwind: { path: "$p", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "p.categoryId",
            foreignField: "_id",
            as: "cat",
          },
        },
        { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$p.categoryId",
            name: { $first: "$cat.name" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Invoice.find({
        ...tenantInvoices(tenantId),
        status: "unpaid",
        hold: { $ne: true },
        $expr: { $gt: [{ $subtract: ["$totalAmount", "$paid"] }, 0] },
      })
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(8)
        .select("invoiceNo customerName customerPhone totalAmount paid dueDate")
        .lean(),
      Purchase.aggregate<{ totalPurchase: number }>([
        { $match: tenantPurchases(tenantId) },
        { $group: { _id: null, totalPurchase: { $sum: "$totalAmount" } } },
      ]),
      PurchaseReturn.aggregate<{ totalReturn: number }>([
        { $match: tenantPurchaseReturns(tenantId) },
        { $group: { _id: null, totalReturn: { $sum: "$totalAmount" } } },
      ]),
      Purchase.find({
        ...tenantPurchases(tenantId),
        status: "unpaid",
        hold: { $ne: true },
        $expr: { $gt: [{ $subtract: ["$totalAmount", "$paid"] }, 0] },
      })
        .sort({ dueDate: 1, createdAt: -1 })
        .limit(8)
        .select("purchaseNo supplierName supplierPhone totalAmount paid dueDate")
        .lean(),
    ]);

    const totalSales = roundMoney(invoiceAgg[0]?.totalSales ?? 0);
    const totalSalesReturn = roundMoney(retAgg[0]?.totalReturn ?? 0);
    const totalPaymentReturns = roundMoney(retAgg[0]?.totalPaid ?? 0);
    const totalPurchase = roundMoney(purchaseAgg[0]?.totalPurchase ?? 0);
    const totalPurchaseReturn = roundMoney(purchaseReturnAgg[0]?.totalReturn ?? 0);
    const invoiceDue = roundMoney(outstandingAgg[0]?.due ?? 0);
    const collectedIncome = roundMoney(collectedAgg[0]?.collected ?? 0);
    const profit = roundMoney(Math.max(0, totalSales - totalSalesReturn));

    const salesThisM = roundMoney(monthSales[0]?.s ?? 0);
    const salesPrevM = roundMoney(monthSalesPrev[0]?.s ?? 0);
    const retThisM = roundMoney(monthReturns[0]?.s ?? 0);
    const retPrevM = roundMoney(monthReturnsPrev[0]?.s ?? 0);
    const collectedThisM = roundMoney(monthCollected[0]?.s ?? 0);
    const collectedPrevM = roundMoney(monthCollectedPrev[0]?.s ?? 0);

    const co = customerAgg[0];
    const firstTime = co?.once ?? 0;
    const returning = co?.repeat ?? 0;

    const productIds = topProductsAgg.map((p) => p._id);
    const productImages = await Product.find({
      tenantId,
      _id: { $in: productIds },
      isDeleted: { $ne: true },
    })
      .select("images")
      .lean();
    const imgById = new Map(
      productImages.map((p) => {
        const imgs = p.images as string[] | undefined;
        const url = Array.isArray(imgs) && imgs[0] ? String(imgs[0]) : "";
        return [String(p._id), url];
      })
    );

    const topProducts = topProductsAgg.map((p) => ({
      productId: String(p._id),
      name: p.name,
      price: roundMoney(p.unitPrice),
      qtySold: p.qtySold,
      revenue: roundMoney(p.revenue),
      imageUrl: imgById.get(String(p._id)) ?? "",
    }));

    const lowStock = lowStockDocs.map((p) => {
      const imgs = p.images as string[] | undefined;
      return {
        id: String(p._id),
        name: String(p.name),
        sku: String(p.sku ?? ""),
        quantity: Number(p.quantity ?? 0),
        imageUrl: Array.isArray(imgs) && imgs[0] ? String(imgs[0]) : "",
      };
    });

    const startToday = sod.getTime();
    type InvLean = {
      _id: mongoose.Types.ObjectId;
      invoiceNo: string;
      items?: { productName?: string; productId?: mongoose.Types.ObjectId }[];
      totalAmount: number;
      status: string;
      dueDate: Date;
      createdAt?: Date;
    };
    const recent = (recentInvoices as InvLean[]).map((inv) => {
      const first = inv.items?.[0];
      const due = new Date(inv.dueDate).getTime();
      const st = inv.status;
      let uiStatus: "paid" | "unpaid" | "overdue" = st === "paid" ? "paid" : "unpaid";
      if (st === "unpaid" && due < startToday) uiStatus = "overdue";
      const createdAt = inv.createdAt ? new Date(inv.createdAt).getTime() : 0;
      return {
        id: String(inv._id),
        invoiceNo: String(inv.invoiceNo),
        productLabel: first?.productName ?? "—",
        categoryLabel: "Invoice",
        amount: roundMoney(Number(inv.totalAmount)),
        status: uiStatus,
        date: (inv.createdAt ? new Date(inv.createdAt) : new Date()).toISOString(),
        isToday: createdAt >= startToday,
        productId: first?.productId ? String(first.productId) : "",
      };
    });

    const recentIds = recent.filter((r) => r.productId).map((r) => r.productId);
    const recentProds = await Product.find({
      tenantId,
      _id: { $in: recentIds },
      isDeleted: { $ne: true },
    })
      .select("images categoryId")
      .populate("categoryId", "name")
      .lean();
    const recentMap = new Map(
      recentProds.map((p) => {
        const imgs = p.images as string[] | undefined;
        const cat = p.categoryId as { name?: string } | null;
        return [
          String(p._id),
          {
            imageUrl: Array.isArray(imgs) && imgs[0] ? String(imgs[0]) : "",
            categoryName: cat && typeof cat === "object" && cat.name ? String(cat.name) : "—",
          },
        ];
      })
    );

    const recentInvoicesOut = recent.map((r) => {
      const extra = r.productId ? recentMap.get(r.productId) : undefined;
      return {
        id: r.id,
        invoiceNo: r.invoiceNo,
        productLabel: r.productLabel,
        categoryLabel: extra?.categoryName ?? r.categoryLabel,
        amount: r.amount,
        status: r.status,
        date: r.date,
        isToday: r.isToday,
        imageUrl: extra?.imageUrl ?? "",
      };
    });

    const topCustomers = topCustomersAgg.map((c) => {
      const id =
        c._id && typeof c._id === "object" && "toString" in c._id
          ? String(c._id)
          : undefined;
      return {
        id,
        name: (c as { resolvedName?: string }).resolvedName || c.name || "—",
        orders: c.orders,
        revenue: roundMoney(c.revenue),
      };
    });

    const topCategories = topCatAgg.map((c) => ({
      categoryId: c._id ? String(c._id) : null,
      name: c.name || "Uncategorized",
      revenue: roundMoney(c.revenue),
    }));

    const dueInvoices = (
      dueInvoiceDocs as {
        _id: mongoose.Types.ObjectId;
        invoiceNo: string;
        customerName?: string;
        customerPhone?: string;
        totalAmount: number;
        paid: number;
        dueDate: Date;
      }[]
    ).map((inv) => {
      const amountDue = roundMoney(Number(inv.totalAmount) - Number(inv.paid));
      const dueMs = new Date(inv.dueDate).getTime();
      return {
        id: String(inv._id),
        invoiceNo: String(inv.invoiceNo),
        customerName: String(inv.customerName ?? ""),
        customerPhone: String(inv.customerPhone ?? ""),
        totalAmount: roundMoney(Number(inv.totalAmount)),
        paid: roundMoney(Number(inv.paid)),
        amountDue,
        dueDate: new Date(inv.dueDate).toISOString(),
        overdue: dueMs < startToday,
      };
    });

    const duePurchases = (
      duePurchaseDocs as {
        _id: mongoose.Types.ObjectId;
        purchaseNo: string;
        supplierName?: string;
        supplierPhone?: string;
        totalAmount: number;
        paid: number;
        dueDate: Date;
      }[]
    ).map((p) => {
      const amountDue = roundMoney(Number(p.totalAmount) - Number(p.paid));
      const dueMs = new Date(p.dueDate).getTime();
      return {
        id: String(p._id),
        purchaseNo: String(p.purchaseNo),
        supplierName: String(p.supplierName ?? ""),
        supplierPhone: String(p.supplierPhone ?? ""),
        totalAmount: roundMoney(Number(p.totalAmount)),
        paid: roundMoney(Number(p.paid)),
        amountDue,
        dueDate: new Date(p.dueDate).toISOString(),
        overdue: dueMs < startToday,
      };
    });

    return {
      totals: {
        totalSales,
        totalSalesReturn,
        totalPurchase,
        totalPurchaseReturn,
        profit,
        collectedIncome,
        invoiceDue,
        totalExpenses: 0,
        totalPaymentReturns,
      },
      trends: {
        salesPctVsLastMonth: pctChange(salesThisM, salesPrevM),
        salesReturnPctVsLastMonth: pctChange(retThisM, retPrevM),
        profitPctVsLastMonth: pctChange(
          roundMoney(salesThisM - retThisM),
          roundMoney(salesPrevM - retPrevM)
        ),
        collectedIncomePctVsLastMonth: pctChange(collectedThisM, collectedPrevM),
        invoiceDuePctVsLastMonth: null as number | null,
      },
      counts: {
        suppliers,
        customers: (firstTime + returning) || 0,
        orders: invoiceCount,
        products,
        categories,
        invoicesToday,
      },
      customersOverview: {
        firstTime,
        returning,
      },
      topProducts,
      lowStock,
      recentInvoices: recentInvoicesOut,
      dueInvoices,
      duePurchases,
      topCustomers,
      topCategories,
      categoryStats: {
        categoryCount: categories,
        productCount: products,
      },
      orderHeatmap: heatmap,
      chartPoints,
      chartRange,
    };
  },

  async getProfitLoss(
    tenantId: string,
    opts: {
      preset: ProfitLossPreset;
      from?: string;
      to?: string;
    }
  ) {
    const { from, to, label } = resolveProfitLossRange(opts.preset, opts.from, opts.to);
    const dateFilter = { $gte: from, $lte: to };

    const [
      salesAgg,
      salesReturnAgg,
      purchaseAgg,
      purchaseReturnAgg,
      salesCount,
      purchaseCount,
    ] = await Promise.all([
      Invoice.aggregate<{ total: number; paid: number }>([
        {
          $match: {
            ...tenantInvoices(tenantId),
            hold: { $ne: true },
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            paid: { $sum: "$paid" },
          },
        },
      ]),
      SalesReturn.aggregate<{ total: number }>([
        {
          $match: {
            ...tenantReturns(tenantId),
            createdAt: dateFilter,
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Purchase.aggregate<{ total: number; paid: number }>([
        {
          $match: {
            ...tenantPurchases(tenantId),
            hold: { $ne: true },
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            paid: { $sum: "$paid" },
          },
        },
      ]),
      PurchaseReturn.aggregate<{ total: number }>([
        {
          $match: {
            ...tenantPurchaseReturns(tenantId),
            createdAt: dateFilter,
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Invoice.countDocuments({
        ...tenantInvoices(tenantId),
        hold: { $ne: true },
        createdAt: dateFilter,
      }),
      Purchase.countDocuments({
        ...tenantPurchases(tenantId),
        hold: { $ne: true },
        createdAt: dateFilter,
      }),
    ]);

    const totalSales = roundMoney(salesAgg[0]?.total ?? 0);
    const salesCollected = roundMoney(salesAgg[0]?.paid ?? 0);
    const totalSalesReturn = roundMoney(salesReturnAgg[0]?.total ?? 0);
    const totalPurchase = roundMoney(purchaseAgg[0]?.total ?? 0);
    const purchasePaid = roundMoney(purchaseAgg[0]?.paid ?? 0);
    const totalPurchaseReturn = roundMoney(purchaseReturnAgg[0]?.total ?? 0);

    const netSales = roundMoney(totalSales - totalSalesReturn);
    const netPurchase = roundMoney(totalPurchase - totalPurchaseReturn);
    const grossProfit = roundMoney(netSales - netPurchase);
    const profitMargin =
      netSales > 0 ? Math.round((grossProfit / netSales) * 10000) / 100 : null;

    return {
      preset: opts.preset,
      label,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        totalSales,
        totalSalesReturn,
        netSales,
        totalPurchase,
        totalPurchaseReturn,
        netPurchase,
        grossProfit,
        profitMargin,
        salesCollected,
        purchasePaid,
      },
      counts: {
        salesOrders: salesCount,
        purchaseOrders: purchaseCount,
      },
    };
  },
};
