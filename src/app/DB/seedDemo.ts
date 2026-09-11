import mongoose from "mongoose";
import { DEMO_ACCESS } from "./demoAccess";
import { User } from "../User/user.model";
import { NormalUser } from "../NormalUser/normalUser.model";
import { Store } from "../Store/store.model";
import { Unit } from "../Unit/unit.model";
import { Category } from "../Category/category.model";
import { SubCategory } from "../SubCategory/subCategory.model";
import { Brand } from "../Brand/brand.model";
import { Product } from "../Product/product.model";
import { Customer } from "../Customer/customer.model";
import { Invoice } from "../Invoice/invoice.model";
import { Supplier } from "../Supplier/supplier.model";
import { Purchase } from "../Purchase/purchase.model";
import { SalesReturn } from "../SalesReturn/salesReturn.model";
import { PurchaseReturn } from "../PurchaseReturn/purchaseReturn.model";

type Id = mongoose.Types.ObjectId;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function atDaysAgo(days: number, hour: number, minute = 20) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function moneyLine(product: { _id: Id; name: string; sku: string; price: number }, qty: number) {
  const lineTotal = Math.round(product.price * qty * 100) / 100;
  return {
    productId: product._id,
    productName: product.name,
    sku: product.sku,
    qty,
    unitPrice: product.price,
    discount: 0,
    lineTotal,
  };
}

async function nextFreeTenantId() {
  const used = new Set<string>();
  const [users, profiles] = await Promise.all([
    User.find({ tenantId: { $regex: /^t-\d{4}$/ } }, { tenantId: 1 }).lean(),
    NormalUser.find({ tenantId: { $regex: /^t-\d{4}$/ } }, { tenantId: 1 }).lean(),
  ]);
  for (const doc of [...users, ...profiles]) {
    if (doc.tenantId) used.add(doc.tenantId);
  }
  let n = 2;
  while (used.has(`t-${String(n).padStart(4, "0")}`)) n += 1;
  return `t-${String(n).padStart(4, "0")}`;
}

async function nextFreeNumericId() {
  const lastUser = await User.findOne({ id: { $regex: /^\d+$/ } }, { id: 1 })
    .sort({ id: -1 })
    .lean();
  const lastProfile = await NormalUser.findOne({ id: { $regex: /^\d+$/ } }, { id: 1 })
    .sort({ id: -1 })
    .lean();
  const fromUser = lastUser?.id ? parseInt(lastUser.id, 10) : 47373;
  const fromProfile = lastProfile?.id ? parseInt(lastProfile.id, 10) : 47373;
  let next = Math.max(fromUser, fromProfile, 47373) + 1;

  for (let i = 0; i < 20; i++) {
    const id = String(next + i);
    const taken =
      (await User.findOne({ id }).select("_id")) ||
      (await NormalUser.findOne({ id }).select("_id"));
    if (!taken) return id;
  }
  return String(Date.now()).slice(-8);
}

async function ensureNormalUser(user: {
  _id: Id;
  id?: string;
  tenantId?: string;
}) {
  const existing =
    (await NormalUser.findOne({ user: user._id })) ||
    (await NormalUser.findOne({ email: DEMO_ACCESS.email }));
  if (existing) {
    existing.contactNo = DEMO_ACCESS.contactNo;
    existing.email = DEMO_ACCESS.email;
    existing.name = DEMO_ACCESS.name;
    existing.tenantId = user.tenantId ?? existing.tenantId;
    existing.isDeleted = false;
    await existing.save();
    return existing;
  }

  const tenantTaken = user.tenantId
    ? await NormalUser.findOne({ tenantId: user.tenantId }).select("_id user")
    : null;
  if (tenantTaken && String(tenantTaken.user) !== String(user._id)) {
    const tenantId = await nextFreeTenantId();
    await User.updateOne({ _id: user._id }, { $set: { tenantId } });
    user.tenantId = tenantId;
  }

  const idTaken = user.id ? await NormalUser.findOne({ id: user.id }).select("_id") : true;
  const id = !idTaken && user.id ? user.id : await nextFreeNumericId();
  if (user.id !== id) {
    await User.updateOne({ _id: user._id }, { $set: { id, referralId: `CZ${id}` } });
  }

  await NormalUser.create({
    id,
    user: user._id,
    tenantId: user.tenantId,
    name: DEMO_ACCESS.name,
    email: DEMO_ACCESS.email,
    contactNo: DEMO_ACCESS.contactNo,
    gender: "male",
    presentAddress: "House 12, Road 7, Dhanmondi, Dhaka 1209",
    referralId: `CZ${id}`,
    referredBy: "self",
    refferCount: 0,
    city: "Dhaka",
    country: "Bangladesh",
    profileImg:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
  });
}

async function ensureDemoUser() {
  const existingByEmail = await User.findOne({ email: DEMO_ACCESS.email }).select("+password");
  if (existingByEmail) {
    existingByEmail.password = DEMO_ACCESS.password;
    existingByEmail.needsPasswordChange = false;
    existingByEmail.isVerified = true;
    existingByEmail.status = "active";
    existingByEmail.isDeleted = false;
    existingByEmail.username = DEMO_ACCESS.username;
    existingByEmail.subscriptionStatus = "active";
    existingByEmail.subscriptionStartDate = new Date();
    existingByEmail.subscriptionEndDate = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    );
    await existingByEmail.save();
    await ensureNormalUser(existingByEmail);
    return existingByEmail;
  }

  const phoneTaken = await NormalUser.findOne({ contactNo: DEMO_ACCESS.contactNo });
  if (phoneTaken) {
    const owner = await User.findById(phoneTaken.user).select("+password");
    if (owner) {
      console.warn(
        `[Seed] Demo phone ${DEMO_ACCESS.contactNo} already belongs to ${owner.email} — skipping new demo user`
      );
      return owner;
    }
  }

  const id = await nextFreeNumericId();
  const tenantId = await nextFreeTenantId();
  const user = await User.create({
    id,
    username: DEMO_ACCESS.username,
    email: DEMO_ACCESS.email,
    tenantId,
    password: DEMO_ACCESS.password,
    role: "user",
    needsPasswordChange: false,
    status: "active",
    isDeleted: false,
    isVerified: true,
    referralId: `CZ${id}`,
    referredBy: "self",
    subscriptionStatus: "active",
    subscriptionStartDate: new Date(),
    subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });

  await ensureNormalUser(user);

  console.log(
    `[Seed] Demo user created → phone: ${DEMO_ACCESS.contactNo} | password: ${DEMO_ACCESS.password} | tenantId: ${tenantId}`
  );
  return user;
}

async function seedDummyCatalog(tenantId: string, userId: Id) {
  const productCount = await Product.countDocuments({ tenantId, isDeleted: { $ne: true } });
  if (productCount > 0) {
    console.log(`[Seed] Demo catalog already present for ${tenantId} (${productCount} products)`);
    return;
  }

  const store = await Store.create({
    tenantId,
    name: DEMO_ACCESS.storeName,
    slug: "dhaka-grocery-mart",
    phone: DEMO_ACCESS.contactNo,
    email: DEMO_ACCESS.email,
    address: "House 12, Road 7, Dhanmondi, Dhaka 1209",
    status: "active",
    createdBy: userId,
  });

  const [pcs] = await Unit.create([
    { tenantId, name: "Piece", shortName: "pcs", status: "active", createdBy: userId },
    { tenantId, name: "Kilogram", shortName: "kg", status: "active", createdBy: userId },
    { tenantId, name: "Litre", shortName: "L", status: "active", createdBy: userId },
  ]);

  const units = await Unit.find({ tenantId }).lean();
  const unitByShort = new Map(units.map((u) => [u.shortName, u._id as Id]));

  const categoryDefs = [
    {
      name: "Grocery",
      description: "Rice, oil, spices and daily staples",
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    },
    {
      name: "Beverages",
      description: "Drinks, tea, and packaged juices",
      imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&q=80",
    },
    {
      name: "Personal Care",
      description: "Toiletries and hygiene",
      imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    },
    {
      name: "Household",
      description: "Cleaning and home supplies",
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    },
  ];

  const categories = await Category.insertMany(
    categoryDefs.map((c) => ({
      tenantId,
      name: c.name,
      slug: slugify(c.name),
      description: c.description,
      imageUrl: c.imageUrl,
      status: "active" as const,
      createdBy: userId,
    }))
  );
  const catByName = new Map(categories.map((c) => [c.name, c._id as Id]));

  const subDefs = [
    { category: "Grocery", name: "Staples", code: "GRO-STP" },
    { category: "Grocery", name: "Dairy & Eggs", code: "GRO-DRY" },
    { category: "Beverages", name: "Soft Drinks", code: "BEV-SFT" },
    { category: "Beverages", name: "Tea & Coffee", code: "BEV-TEA" },
    { category: "Personal Care", name: "Oral Care", code: "PC-ORL" },
    { category: "Household", name: "Cleaning", code: "HH-CLN" },
  ];

  const subs = await SubCategory.insertMany(
    subDefs.map((s) => ({
      tenantId,
      categoryId: catByName.get(s.category),
      subCategoryName: s.name,
      slug: slugify(s.name),
      code: s.code,
      status: "active" as const,
      createdBy: userId,
    }))
  );
  const subByName = new Map(subs.map((s) => [s.subCategoryName, s._id as Id]));

  const brandDefs = [
    { name: "Pran", imageUrl: "https://images.unsplash.com/photo-1580913428023-02c695666d61?w=200&q=80" },
    { name: "ACI", imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200&q=80" },
    { name: "Fresh", imageUrl: "https://images.unsplash.com/photo-1461354463484-4c1d34186ba8?w=200&q=80" },
    { name: "Coca-Cola", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&q=80" },
    { name: "Closeup", imageUrl: "https://images.unsplash.com/photo-1559591935-c6c92c6c2c8a?w=200&q=80" },
  ];

  const brands = await Brand.insertMany(
    brandDefs.map((b) => ({
      tenantId,
      name: b.name,
      slug: slugify(b.name),
      imageUrl: b.imageUrl,
      status: "active" as const,
      createdBy: userId,
    }))
  );
  const brandByName = new Map(brands.map((b) => [b.name, b._id as Id]));

  const yesterday = atDaysAgo(1, 8);
  const nextMonth = atDaysAgo(-30, 8);

  const productDefs = [
    {
      name: "Miniket Rice 25kg",
      sku: "DEMO-RICE-25",
      category: "Grocery",
      sub: "Staples",
      brand: "ACI",
      unit: "pcs",
      qty: 48,
      low: 8,
      price: 2450,
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80",
    },
    {
      name: "Fresh Soybean Oil 5L",
      sku: "DEMO-OIL-5L",
      category: "Grocery",
      sub: "Staples",
      brand: "Fresh",
      unit: "L",
      qty: 32,
      low: 6,
      price: 890,
      image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80",
    },
    {
      name: "Pran Full Cream Milk 1L",
      sku: "DEMO-MILK-1L",
      category: "Grocery",
      sub: "Dairy & Eggs",
      brand: "Pran",
      unit: "L",
      qty: 4,
      low: 10,
      price: 95,
      expiryOn: yesterday,
      image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80",
    },
    {
      name: "Farm Fresh Eggs (Dozen)",
      sku: "DEMO-EGG-12",
      category: "Grocery",
      sub: "Dairy & Eggs",
      brand: "Fresh",
      unit: "pcs",
      qty: 6,
      low: 12,
      price: 160,
      image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&q=80",
    },
    {
      name: "Onion 1kg",
      sku: "DEMO-ONI-1",
      category: "Grocery",
      sub: "Staples",
      brand: "Fresh",
      unit: "kg",
      qty: 85,
      low: 15,
      price: 70,
      image: "https://images.unsplash.com/photo-1518977956812-cd3ee41be3de?w=600&q=80",
    },
    {
      name: "Potato 1kg",
      sku: "DEMO-POT-1",
      category: "Grocery",
      sub: "Staples",
      brand: "Fresh",
      unit: "kg",
      qty: 120,
      low: 20,
      price: 45,
      image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80",
    },
    {
      name: "Coca-Cola 2L",
      sku: "DEMO-COKE-2L",
      category: "Beverages",
      sub: "Soft Drinks",
      brand: "Coca-Cola",
      unit: "pcs",
      qty: 40,
      low: 10,
      price: 110,
      image: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600&q=80",
    },
    {
      name: "Ispahani Tea 200g",
      sku: "DEMO-TEA-200",
      category: "Beverages",
      sub: "Tea & Coffee",
      brand: "Fresh",
      unit: "pcs",
      qty: 22,
      low: 8,
      price: 185,
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80",
    },
    {
      name: "Closeup Toothpaste 120g",
      sku: "DEMO-PASTE-120",
      category: "Personal Care",
      sub: "Oral Care",
      brand: "Closeup",
      unit: "pcs",
      qty: 3,
      low: 10,
      price: 95,
      image: "https://images.unsplash.com/photo-1559591935-c6c92c6c2c8a?w=600&q=80",
    },
    {
      name: "Surf Excel 1kg",
      sku: "DEMO-SURF-1",
      category: "Household",
      sub: "Cleaning",
      brand: "ACI",
      unit: "pcs",
      qty: 18,
      low: 5,
      price: 240,
      expiryOn: nextMonth,
      image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&q=80",
    },
    {
      name: "Sugar 1kg",
      sku: "DEMO-SUG-1",
      category: "Grocery",
      sub: "Staples",
      brand: "Fresh",
      unit: "kg",
      qty: 55,
      low: 10,
      price: 130,
      image: "https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?w=600&q=80",
    },
    {
      name: "Pran Instant Noodles (Pack)",
      sku: "DEMO-NOOD-1",
      category: "Grocery",
      sub: "Staples",
      brand: "Pran",
      unit: "pcs",
      qty: 70,
      low: 15,
      price: 22,
      image: "https://images.unsplash.com/photo-1612929633732-5fe7b9715ea0?w=600&q=80",
    },
  ];

  const products = await Product.insertMany(
    productDefs.map((p) => ({
      tenantId,
      storeId: store._id,
      name: p.name,
      slug: slugify(p.name),
      sku: p.sku,
      sellingType: "single" as const,
      categoryId: catByName.get(p.category),
      subCategoryId: subByName.get(p.sub),
      brandId: brandByName.get(p.brand),
      unitId: unitByShort.get(p.unit) ?? pcs._id,
      quantity: p.qty,
      lowStockThreshold: p.low,
      price: p.price,
      images: [p.image],
      manufacturer: p.brand,
      status: "active" as const,
      barcodeSymbology: "CODE128" as const,
      itemBarcode: p.sku,
      taxType: "VAT",
      expiryOn: p.expiryOn,
      createdBy: userId,
    }))
  );

  const pBySku = new Map(
    products.map((p) => [
      p.sku,
      {
        _id: p._id as Id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        images: p.images,
      },
    ])
  );

  const customers = await Customer.insertMany([
    {
      tenantId,
      name: "Karim Traders",
      phone: "+8801712001001",
      email: "karim@example.com",
      address: "Mirpur 10, Dhaka",
      status: "active",
      createdBy: userId,
    },
    {
      tenantId,
      name: "Fatema Store",
      phone: "+8801812001002",
      email: "fatema@example.com",
      address: "Mohammadpur, Dhaka",
      status: "active",
      createdBy: userId,
    },
    {
      tenantId,
      name: "Nusrat Pharmacy Counter",
      phone: "+8801912001003",
      email: "nusrat@example.com",
      address: "Banani, Dhaka",
      status: "active",
      createdBy: userId,
    },
    {
      tenantId,
      name: "Walk-in Customer",
      phone: "+8801612001004",
      address: "Dhanmondi, Dhaka",
      status: "active",
      createdBy: userId,
    },
    {
      tenantId,
      name: "City Cafe",
      phone: "+8801512001005",
      email: "cafe@example.com",
      address: "Gulshan 2, Dhaka",
      status: "active",
      createdBy: userId,
    },
  ]);

  const fromParty = {
    name: DEMO_ACCESS.storeName,
    address: "House 12, Road 7, Dhanmondi, Dhaka 1209",
    email: DEMO_ACCESS.email,
    phone: DEMO_ACCESS.contactNo,
  };

  const rice = pBySku.get("DEMO-RICE-25")!;
  const oil = pBySku.get("DEMO-OIL-5L")!;
  const milk = pBySku.get("DEMO-MILK-1L")!;
  const eggs = pBySku.get("DEMO-EGG-12")!;
  const onion = pBySku.get("DEMO-ONI-1")!;
  const potato = pBySku.get("DEMO-POT-1")!;
  const coke = pBySku.get("DEMO-COKE-2L")!;
  const tea = pBySku.get("DEMO-TEA-200")!;
  const paste = pBySku.get("DEMO-PASTE-120")!;
  const surf = pBySku.get("DEMO-SURF-1")!;
  const sugar = pBySku.get("DEMO-SUG-1")!;
  const noodles = pBySku.get("DEMO-NOOD-1")!;

  const [c0, c1, c2, c3, c4] = customers;

  type SaleSpec = {
    no: string;
    customer: (typeof customers)[0];
    items: ReturnType<typeof moneyLine>[];
    daysAgo: number;
    hour: number;
    paidRatio: number;
    overdueDays?: number;
    paymentType: "cash" | "card" | "bkash" | "nagad";
  };

  const sales: SaleSpec[] = [
    {
      no: "INV0001",
      customer: c0,
      items: [moneyLine(rice, 2), moneyLine(oil, 3)],
      daysAgo: 38,
      hour: 11,
      paidRatio: 1,
      paymentType: "cash",
    },
    {
      no: "INV0002",
      customer: c1,
      items: [moneyLine(sugar, 10), moneyLine(onion, 8)],
      daysAgo: 34,
      hour: 16,
      paidRatio: 1,
      paymentType: "bkash",
    },
    {
      no: "INV0003",
      customer: c4,
      items: [moneyLine(tea, 6), moneyLine(milk, 12), moneyLine(noodles, 20)],
      daysAgo: 31,
      hour: 10,
      paidRatio: 1,
      paymentType: "card",
    },
    {
      no: "INV0004",
      customer: c2,
      items: [moneyLine(paste, 4), moneyLine(surf, 2)],
      daysAgo: 18,
      hour: 13,
      paidRatio: 1,
      paymentType: "nagad",
    },
    {
      no: "INV0005",
      customer: c0,
      items: [moneyLine(rice, 1), moneyLine(potato, 15), moneyLine(onion, 10)],
      daysAgo: 12,
      hour: 9,
      paidRatio: 1,
      paymentType: "cash",
    },
    {
      no: "INV0006",
      customer: c3,
      items: [moneyLine(coke, 6), moneyLine(noodles, 8)],
      daysAgo: 8,
      hour: 19,
      paidRatio: 1,
      paymentType: "bkash",
    },
    {
      no: "INV0007",
      customer: c1,
      items: [moneyLine(oil, 2), moneyLine(sugar, 5), moneyLine(eggs, 4)],
      daysAgo: 5,
      hour: 12,
      paidRatio: 0.4,
      overdueDays: 2,
      paymentType: "cash",
    },
    {
      no: "INV0008",
      customer: c4,
      items: [moneyLine(tea, 3), moneyLine(milk, 8)],
      daysAgo: 3,
      hour: 8,
      paidRatio: 1,
      paymentType: "card",
    },
    {
      no: "INV0009",
      customer: c2,
      items: [moneyLine(surf, 1), moneyLine(paste, 2), moneyLine(coke, 4)],
      daysAgo: 2,
      hour: 15,
      paidRatio: 0,
      overdueDays: 1,
      paymentType: "nagad",
    },
    {
      no: "INV0010",
      customer: c0,
      items: [moneyLine(rice, 1), moneyLine(oil, 1), moneyLine(onion, 5)],
      daysAgo: 1,
      hour: 11,
      paidRatio: 1,
      paymentType: "bkash",
    },
    {
      no: "INV0011",
      customer: c3,
      items: [moneyLine(potato, 6), moneyLine(eggs, 2), moneyLine(noodles, 10)],
      daysAgo: 0,
      hour: 9,
      paidRatio: 1,
      paymentType: "cash",
    },
    {
      no: "INV0012",
      customer: c1,
      items: [moneyLine(sugar, 4), moneyLine(tea, 2)],
      daysAgo: 0,
      hour: 12,
      paidRatio: 0,
      paymentType: "cash",
    },
    {
      no: "INV0013",
      customer: c4,
      items: [moneyLine(coke, 8), moneyLine(noodles, 15), moneyLine(milk, 6)],
      daysAgo: 0,
      hour: 16,
      paidRatio: 1,
      paymentType: "card",
    },
  ];

  await Invoice.insertMany(
    sales.map((s) => {
      const subTotal = s.items.reduce((sum, i) => sum + i.lineTotal, 0);
      const totalAmount = subTotal;
      const paid = Math.round(totalAmount * s.paidRatio * 100) / 100;
      const createdAt = atDaysAgo(s.daysAgo, s.hour);
      const dueBase = s.overdueDays != null ? atDaysAgo(s.overdueDays, 18) : atDaysAgo(-7, 18);
      return {
        tenantId,
        invoiceNo: s.no,
        fromParty,
        customerId: s.customer._id,
        customerName: s.customer.name,
        customerEmail: s.customer.email ?? "",
        customerPhone: s.customer.phone ?? "",
        customerAddress: s.customer.address ?? "",
        title: "Sales invoice",
        items: s.items,
        subTotal,
        discountTotal: 0,
        vatPercent: 0,
        vatAmount: 0,
        totalAmount,
        paid,
        status: paid >= totalAmount ? ("paid" as const) : ("unpaid" as const),
        dueDate: dueBase,
        hold: false,
        paymentType: s.paymentType,
        cashAmount: s.paymentType === "cash" ? paid : 0,
        changeAmount: 0,
        stockDeducted: true,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
      };
    })
  );

  const suppliers = await Supplier.insertMany([
    {
      supplierId: "SUP-0001",
      tenantId,
      name: "Bengal Wholesale Ltd",
      phone: "+8801713002001",
      email: "bengal@example.com",
      address: "Kawran Bazar, Dhaka",
      balance: 0,
      createdBy: userId,
      status: "active",
    },
    {
      supplierId: "SUP-0002",
      tenantId,
      name: "Fresh Agro Supply",
      phone: "+8801813002002",
      email: "agro@example.com",
      address: "Jatrabari, Dhaka",
      balance: 12000,
      createdBy: userId,
      status: "active",
    },
  ]);

  const cost = (sku: string, unitCost: number, qty: number) => {
    const prod = pBySku.get(sku)!;
    const lineTotal = unitCost * qty;
    return {
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      qty,
      unitPrice: unitCost,
      discount: 0,
      lineTotal,
    };
  };

  const purchaseSpecs = [
    {
      no: "PUR0001",
      supplier: suppliers[0],
      items: [cost("DEMO-RICE-25", 2100, 20), cost("DEMO-OIL-5L", 760, 15)],
      daysAgo: 20,
      paidRatio: 1,
    },
    {
      no: "PUR0002",
      supplier: suppliers[1],
      items: [cost("DEMO-ONI-1", 48, 80), cost("DEMO-POT-1", 30, 100), cost("DEMO-EGG-12", 125, 24)],
      daysAgo: 9,
      paidRatio: 0.5,
    },
    {
      no: "PUR0003",
      supplier: suppliers[0],
      items: [cost("DEMO-COKE-2L", 88, 30), cost("DEMO-NOOD-1", 16, 80), cost("DEMO-SUG-1", 110, 40)],
      daysAgo: 2,
      paidRatio: 1,
    },
  ];

  await Purchase.insertMany(
    purchaseSpecs.map((p) => {
      const subTotal = p.items.reduce((sum, i) => sum + i.lineTotal, 0);
      const paid = Math.round(subTotal * p.paidRatio * 100) / 100;
      const createdAt = atDaysAgo(p.daysAgo, 10);
      return {
        tenantId,
        purchaseNo: p.no,
        supplierId: p.supplier._id,
        supplierName: p.supplier.name,
        supplierEmail: p.supplier.email ?? "",
        supplierPhone: p.supplier.phone ?? "",
        supplierAddress: p.supplier.address ?? "",
        title: "Purchase",
        items: p.items,
        subTotal,
        discountTotal: 0,
        vatPercent: 0,
        vatAmount: 0,
        totalAmount: subTotal,
        paid,
        status: paid >= subTotal ? ("paid" as const) : ("unpaid" as const),
        dueDate: atDaysAgo(p.paidRatio < 1 ? -5 : -14, 18),
        hold: false,
        paymentType: "cash" as const,
        stockAdded: true,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
      };
    })
  );

  const srItems = [
    {
      productId: milk._id,
      productName: milk.name,
      sku: milk.sku,
      imageUrl: milk.images?.[0] ?? "",
      qty: 2,
      unitPrice: milk.price,
      discount: 0,
      taxPct: 0,
      lineSubtotal: milk.price * 2,
    },
  ];
  await SalesReturn.create({
    tenantId,
    returnNo: "SR0001",
    reference: "INV0003",
    customerName: c4.name,
    returnDate: atDaysAgo(28, 14),
    items: srItems,
    orderTax: 0,
    discount: 0,
    shipping: 0,
    linesSubTotal: srItems[0].lineSubtotal,
    totalAmount: srItems[0].lineSubtotal,
    paid: srItems[0].lineSubtotal,
    returnStatus: "received",
    paymentStatus: "paid",
    stockRestored: true,
    createdBy: userId,
    createdAt: atDaysAgo(28, 14),
  });

  const prItems = [
    {
      productId: oil._id,
      productName: oil.name,
      sku: oil.sku,
      imageUrl: "",
      qty: 1,
      unitPrice: 760,
      discount: 0,
      taxPct: 0,
      lineSubtotal: 760,
    },
  ];
  await PurchaseReturn.create({
    tenantId,
    returnNo: "PR0001",
    reference: "PUR0001",
    supplierName: suppliers[0].name,
    returnDate: atDaysAgo(16, 11),
    items: prItems,
    orderTax: 0,
    discount: 0,
    shipping: 0,
    linesSubTotal: 760,
    totalAmount: 760,
    paid: 760,
    returnStatus: "received",
    paymentStatus: "paid",
    stockDeducted: true,
    createdBy: userId,
    createdAt: atDaysAgo(16, 11),
  });

  console.log(
    `[Seed] Demo dummy data ready → ${products.length} products, ${customers.length} customers, ${sales.length} invoices`
  );
}

export async function seedDemoTenant() {
  const user = await ensureDemoUser();
  const tenantId = user.tenantId;
  if (!tenantId) {
    throw new Error("Demo user has no tenantId");
  }
  await seedDummyCatalog(tenantId, user._id as Id);
  console.log(
    `[Seed] Demo access → phone: ${DEMO_ACCESS.contactNo} | password: ${DEMO_ACCESS.password}`
  );
}
