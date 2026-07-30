import { SalesReturn } from "./salesReturn.model";

const tenantFilter = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true } as const,
});

export async function generateNextReturnNo(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const count = await SalesReturn.countDocuments(tenantFilter(tenantId));
    const seq = count + 1 + attempt;
    const returnNo = `SR${String(seq).padStart(4, "0")}`;
    const exists = await SalesReturn.findOne({ ...tenantFilter(tenantId), returnNo }).select("_id").lean();
    if (!exists) return returnNo;
  }
  return `SR${Date.now().toString(36).toUpperCase()}`;
}
