import { Invoice } from "./invoice.model";

const tenantFilter = (tenantId: string) => ({
  tenantId,
  isDeleted: { $ne: true } as const,
});

export async function generateNextInvoiceNo(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const count = await Invoice.countDocuments(tenantFilter(tenantId));
    const seq = count + 1 + attempt;
    const invoiceNo = `INV${String(seq).padStart(4, "0")}`;
    const exists = await Invoice.findOne({ ...tenantFilter(tenantId), invoiceNo }).select("_id").lean();
    if (!exists) return invoiceNo;
  }
  return `INV${Date.now().toString(36).toUpperCase()}`;
}
