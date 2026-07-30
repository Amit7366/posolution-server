import { Router } from 'express';
import auth from '../middleware/auth';
import validateRequest from '../middleware/validateRequest';
import { stripSpoofedTenantFromBody } from '../middleware/stripSpoofedTenantFromBody';
import { USER_ROLE } from '../User/user.constant';
import { PaymentController } from './payment.controller';
import {
  createPaymentSchema,
  approvePaymentSchema,
  rejectPaymentSchema,
} from './payment.validation';

const router = Router();
router.use(stripSpoofedTenantFromBody);

const admins = [USER_ROLE.superAdmin, USER_ROLE.admin];
const allRoles = [USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.user];

// Subscription status — accessible by any authenticated role
router.get(
  '/subscription/status',
  auth(...allRoles),
  PaymentController.getSubscriptionStatus
);

// User: submit payment
router.post(
  '/',
  auth(USER_ROLE.user),
  validateRequest(createPaymentSchema),
  PaymentController.submit
);

// User: my payment history
router.get('/my', auth(...allRoles), PaymentController.getMyPayments);

// Admin: list all payments
router.get('/', auth(...admins), PaymentController.getAllPayments);

// Admin: approve
router.patch(
  '/:id/approve',
  auth(...admins),
  validateRequest(approvePaymentSchema),
  PaymentController.approvePayment
);

// Admin: reject
router.patch(
  '/:id/reject',
  auth(...admins),
  validateRequest(rejectPaymentSchema),
  PaymentController.rejectPayment
);

export const PaymentRoutes = router;
