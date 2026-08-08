/**
 * Backfill invoice.customerId from Customer records (create missing customers).
 *
 * Usage (from server/):
 *   npx ts-node --transpile-only src/scripts/backfillInvoiceCustomerIds.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

import { Invoice } from "../app/Invoice/invoice.model";
import { Customer } from "../app/Customer/customer.model";

function normalizePhone(phone?: string) {
  return String(phone ?? "").trim();
}

async function findOrCreateCustomer(inv: {
  tenantId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
}) {
  const tenantId = inv.tenantId;
  const name = String(inv.customerName ?? "").trim() || "Walking Customer";
  const phone = normalizePhone(inv.customerPhone);
  const email = String(inv.customerEmail ?? "").trim();
  const address = String(inv.customerAddress ?? "").trim();

  if (phone) {
    const byPhone = await Customer.findOne({ tenantId, phone }).lean();
    if (byPhone) return { customer: byPhone, created: false };
  }

  const byName = await Customer.findOne({
    tenantId,
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  }).lean();
  if (byName) return { customer: byName, created: false };

  try {
    const created = await Customer.create({
      tenantId,
      name,
      phone,
      email,
      address,
      status: "active",
    });
    return { customer: created.toObject(), created: true };
  } catch (err: any) {
    if (err?.code === 11000 && phone) {
      const again = await Customer.findOne({ tenantId, phone }).lean();
      if (again) return { customer: again, created: false };
    }
    throw err;
  }
}

async function main() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL missing");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const filter = {
    isDeleted: { $ne: true },
    $or: [{ customerId: null }, { customerId: { $exists: false } }],
  };

  const total = await Invoice.countDocuments(filter);
  console.log(`Invoices missing customerId: ${total}`);

  const cursor = Invoice.find(filter)
    .select("tenantId customerName customerPhone customerEmail customerAddress")
    .cursor();

  let linked = 0;
  let createdCustomers = 0;
  let failed = 0;

  for await (const inv of cursor) {
    try {
      const { customer, created } = await findOrCreateCustomer(inv as any);
      if (created) createdCustomers++;
      await Invoice.updateOne(
        { _id: inv._id },
        { $set: { customerId: customer._id } }
      );
      linked++;
      if (linked % 50 === 0) console.log(`… linked ${linked}/${total}`);
    } catch (err: any) {
      failed++;
      console.warn(`fail ${inv._id}: ${err?.message || err}`);
    }
  }

  console.log("\n========== Backfill summary ==========");
  console.log(`Linked invoices:     ${linked}`);
  console.log(`Customers created:   ${createdCustomers}`);
  console.log(`Failed:              ${failed}`);
  console.log("======================================\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
