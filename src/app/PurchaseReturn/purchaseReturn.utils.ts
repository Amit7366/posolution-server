import { PurchaseReturn } from "./purchaseReturn.model";

const tenantFilter = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true } as const,
});

export async function generateNextPurchaseReturnNo(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const count = await PurchaseReturn.countDocuments(tenantFilter(tenantId));
    const seq = count + 1 + attempt;
    const returnNo = `PR${String(seq).padStart(4, "0")}`;
    const exists = await PurchaseReturn.findOne({ ...tenantFilter(tenantId), returnNo })
      .select("_id")
      .lean();
    if (!exists) return returnNo;
  }
  return `PR${Date.now().toString(36).toUpperCase()}`;
}
