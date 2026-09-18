import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { Tenant } from './tenant.model';
import { TTenant } from './tenant.interface';
import { generateTenantId } from './tenant.utils';
import { User } from '../User/user.model';
import { NormalUser } from '../NormalUser/normalUser.model';
import { Product } from '../Product/product.model';
import { Invoice } from '../Invoice/invoice.model';
import { Customer } from '../Customer/customer.model';

/**
 * Creates tenant and returns created doc
 */
const createTenantIntoDb = async (payload: Partial<TTenant>, createdBy: any) => {
  const tenantId = await generateTenantId();
  const ownerAdmin = payload.ownerAdmin || createdBy || undefined;

  const doc: Partial<TTenant> = {
    tenantId,
    name: payload.name as string,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    ownerAdmin,
    logo: payload.logo,
    status: payload.status || 'active',
  };

  const created = await Tenant.create(doc);
  return created;
};

const upsertTenantForShopUser = async (params: {
  tenantId: string;
  name?: string;
  email?: string;
  phone?: string;
  ownerId?: unknown;
  status?: 'active' | 'inactive';
  session?: any;
}) => {
  const existingQuery = Tenant.findOne({ tenantId: params.tenantId });
  if (params.session) existingQuery.session(params.session);
  const existing = await existingQuery;
  if (existing) return existing;

  const doc = {
    tenantId: params.tenantId,
    name: params.name || params.email || params.tenantId,
    email: params.email,
    phone: params.phone,
    ownerAdmin: params.ownerId,
    status: params.status || 'active',
  };

  if (params.session) {
    const created = await Tenant.create([doc], { session: params.session });
    return created[0];
  }
  return Tenant.create(doc);
};

const ensureTenantsBackfilled = async () => {
  const shopUsers = await User.find({
    role: 'user',
    isDeleted: { $ne: true },
  })
    .select('_id tenantId email username status')
    .lean();

  if (!shopUsers.length) return;

  const existing = await Tenant.find(
    { tenantId: { $in: shopUsers.map((u) => u.tenantId) } },
    { tenantId: 1 },
  ).lean();
  const have = new Set(existing.map((t) => t.tenantId));
  const missing = shopUsers.filter((u) => u.tenantId && !have.has(u.tenantId));
  if (!missing.length) return;

  const profiles = await NormalUser.find({
    user: { $in: missing.map((u) => u._id) },
  })
    .select('user name contactNo email')
    .lean();
  const profileByUser = new Map(
    profiles.map((p) => [String(p.user), p] as const),
  );

  await Tenant.insertMany(
    missing.map((u) => {
      const profile = profileByUser.get(String(u._id));
      return {
        tenantId: u.tenantId,
        name: profile?.name || u.username || u.email,
        email: profile?.email || u.email,
        phone: profile?.contactNo,
        ownerAdmin: u._id,
        status: u.status === 'inactive' ? 'inactive' : 'active',
      };
    }),
    { ordered: false },
  ).catch(() => undefined);
};

const attachTenantStats = async (tenants: Array<Record<string, any>>) => {
  if (!tenants.length) return [];
  const ids = tenants.map((t) => t.tenantId);
  const [users, products, invoices, customers] = await Promise.all([
    User.find({ tenantId: { $in: ids }, isDeleted: { $ne: true } })
      .select(
        'tenantId email username role status subscriptionStatus subscriptionEndDate',
      )
      .lean(),
    Product.aggregate<{ _id: string; count: number }>([
      { $match: { tenantId: { $in: ids } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
    Invoice.aggregate<{ _id: string; count: number; sales: number }>([
      { $match: { tenantId: { $in: ids }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$tenantId',
          count: { $sum: 1 },
          sales: { $sum: '$totalAmount' },
        },
      },
    ]),
    Customer.aggregate<{ _id: string; count: number }>([
      { $match: { tenantId: { $in: ids }, isDeleted: { $ne: true } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
  ]);

  const userByTenant = new Map(users.map((u) => [u.tenantId, u]));
  const productByTenant = new Map(products.map((p) => [p._id, p.count]));
  const invoiceByTenant = new Map(
    invoices.map((i) => [i._id, { count: i.count, sales: i.sales }]),
  );
  const customerByTenant = new Map(customers.map((c) => [c._id, c.count]));

  return tenants.map((t) => {
    const owner = userByTenant.get(t.tenantId);
    const inv = invoiceByTenant.get(t.tenantId);
    return {
      ...t,
      owner,
      stats: {
        products: productByTenant.get(t.tenantId) ?? 0,
        invoices: inv?.count ?? 0,
        sales: inv?.sales ?? 0,
        customers: customerByTenant.get(t.tenantId) ?? 0,
      },
    };
  });
};

const getAllTenantsFromDB = async (query: Record<string, unknown> = {}) => {
  await ensureTenantsBackfilled();

  const page = Number(query.page) || 1;
  const limit = Math.min(Number(query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  if (query.status === 'active' || query.status === 'inactive') {
    filter.status = query.status;
  }
  if (typeof query.search === 'string' && query.search.trim()) {
    const s = query.search.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { tenantId: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const [rows, total] = await Promise.all([
    Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerAdmin', 'email username role')
      .lean(),
    Tenant.countDocuments(filter),
  ]);

  const data = await attachTenantStats(rows as Record<string, any>[]);
  return { data, meta: { total, page, limit } };
};

const getSingleTenantFromDB = async (tenantId: string) => {
  await ensureTenantsBackfilled();
  const tenant = await Tenant.findOne({ tenantId })
    .populate('ownerAdmin', 'email username role status')
    .lean();
  if (!tenant) throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  const [enriched] = await attachTenantStats([tenant as Record<string, any>]);
  const ownerUser = await User.findOne({
    tenantId,
    role: 'user',
    isDeleted: { $ne: true },
  })
    .select(
      'email username status subscriptionStatus subscriptionStartDate subscriptionEndDate createdAt',
    )
    .lean();
  const profile = ownerUser
    ? await NormalUser.findOne({ user: ownerUser._id })
        .select('name contactNo email presentAddress')
        .lean()
    : null;
  return { ...enriched, ownerUser, profile };
};

const updateTenantIntoDB = async (
  tenantId: string,
  payload: Partial<TTenant>,
) => {
  const updated = await Tenant.findOneAndUpdate({ tenantId }, payload, {
    new: true,
  });
  if (!updated) throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  return updated;
};

const deleteTenantFromDB = async (tenantId: string) => {
  const deleted = await Tenant.findOneAndUpdate(
    { tenantId },
    { status: 'inactive' },
    { new: true },
  );
  if (!deleted) throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  return deleted;
};

export const TenantService = {
  createTenantIntoDb,
  upsertTenantForShopUser,
  ensureTenantsBackfilled,
  getAllTenantsFromDB,
  getSingleTenantFromDB,
  updateTenantIntoDB,
  deleteTenantFromDB,
};
