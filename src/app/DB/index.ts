import config from '../config';
import { USER_ROLE } from '../User/user.constant';
import { User } from '../User/user.model';
import { generateAdminId, generateTenantIdFromUsers } from '../User/user.utils';

const superUser = {
  id:"S-0001",
  username: 'sohoj_admin',
  email: 'admin@sohoj.com',
  tenantId: "t-0001",
  password: config.super_admin_password,
  role: USER_ROLE.superAdmin,
  needsPasswordChange: false,
  status: 'active',
  isDeleted: false,
  country: 'USA',
};

const seedSuperAdmin = async () => {
  //when database is connected, we will check is there any user who is super admin
  const isSuperAdminExits = await User.findOne({ role: USER_ROLE.superAdmin });

  if (!isSuperAdminExits) {
    await User.create(superUser);
  }
};

const seedAdmin = async () => {
  const ADMIN_EMAIL = 'testadmin@sohoj.com';
  const isAdminExists = await User.findOne({ email: ADMIN_EMAIL });

  if (!isAdminExists) {
    const id = await generateAdminId();
    const tenantId = await generateTenantIdFromUsers();
    await User.create({
      id,
      username: 'test_admin',
      email: ADMIN_EMAIL,
      tenantId,
      password: 'Admin12345',
      role: USER_ROLE.admin,
      needsPasswordChange: false,
      status: 'active',
      isDeleted: false,
      isVerified: true,
    });
    console.log(`[Seed] Admin created → email: ${ADMIN_EMAIL} | password: Admin12345 | tenantId: ${tenantId}`);
  }
};

const seed = async () => {
  await seedSuperAdmin();
  await seedAdmin();
};

export default seed;
