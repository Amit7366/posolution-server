import { Purchase } from "./purchase.model";

const tenantFilter = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true } as const,
});

export async function generateNextPurchaseNo(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const count = await Purchase.countDocuments(tenantFilter(tenantId));
    const seq = count + 1 + attempt;
    const purchaseNo = `PUR${String(seq).padStart(4, "0")}`;
    const exists = await Purchase.findOne({ ...tenantFilter(tenantId), purchaseNo })
      .select("_id")
      .lean();
    if (!exists) return purchaseNo;
  }
  return `PUR${Date.now().toString(36).toUpperCase()}`;
}
