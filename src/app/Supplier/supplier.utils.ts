import { Supplier } from "./supplier.model";

export const generateSupplierId = async (tenantId: string): Promise<string> => {
  const docs = await Supplier.find({ tenantId }, { supplierId: 1 }).lean();
  let max = 0;
  for (const d of docs) {
    const part = String(d.supplierId).split("-")[1];
    const n = parseInt(part, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `s-${(max + 1).toString().padStart(3, "0")}`;
};
