import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { Payment } from './payment.model';
import { User } from '../User/user.model';
import AppError from '../errors/AppError';

const SUBSCRIPTION_DAYS = 30;

const submitPayment = async (
  userId: Types.ObjectId,
  tenantId: string,
  payload: {
    paymentMedium: string;
    amount: number;
    senderNumber?: string;
    transactionId: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankName?: string;
    bankBranchName?: string;
  }
) => {
  const payment = await Payment.create({
    userId,
    tenantId,
    ...payload,
    status: 'pending',
  });
  return payment;
};

const getMyPayments = async (tenantId: string) => {
  return Payment.find({ tenantId }).sort({ createdAt: -1 });
};

const getAllPayments = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.tenantId) filter.tenantId = query.tenantId;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email username tenantId')
      .populate('reviewedBy', 'email username'),
    Payment.countDocuments(filter),
  ]);

  return { data, meta: { total, page, limit } };
};

const approvePayment = async (
  paymentId: string,
  adminId: Types.ObjectId,
  note?: string,
  subscriptionDays: number = SUBSCRIPTION_DAYS
) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  if (payment.status !== 'pending')
    throw new AppError(httpStatus.BAD_REQUEST, 'Only pending payments can be approved');

  const now = new Date();

  const user = await User.findById(payment.userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  // Extend from current end date if subscription is still active; otherwise from now
  const currentEnd = (user as any).subscriptionEndDate as Date | undefined;
  const baseDate = currentEnd && currentEnd > now ? currentEnd : now;
  const subscriptionStart = baseDate === now ? now : currentEnd!;
  const subscriptionEnd = new Date(baseDate.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);

  payment.status = 'approved';
  payment.reviewedBy = adminId;
  payment.reviewedAt = now;
  if (note) payment.note = note;
  payment.subscriptionStart = subscriptionStart;
  payment.subscriptionEnd = subscriptionEnd;
  await payment.save();

  await User.findByIdAndUpdate(payment.userId, {
    subscriptionStatus: 'active',
    subscriptionStartDate: subscriptionStart,
    subscriptionEndDate: subscriptionEnd,
  });

  return payment;
};

const rejectPayment = async (
  paymentId: string,
  adminId: Types.ObjectId,
  note?: string
) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  if (payment.status !== 'pending')
    throw new AppError(httpStatus.BAD_REQUEST, 'Only pending payments can be rejected');

  payment.status = 'rejected';
  payment.reviewedBy = adminId;
  payment.reviewedAt = new Date();
  if (note) payment.note = note;
  await payment.save();

  return payment;
};

const getSubscriptionStatus = async (userId: Types.ObjectId, tenantId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const now = new Date();
  const endDate = (user as any).subscriptionEndDate as Date | undefined;
  const storedStatus = (user as any).subscriptionStatus as string | undefined;

  let daysLeft = 0;
  let status = storedStatus || 'none';

  if (endDate) {
    const diff = endDate.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    // Auto-expire if end date has passed but status is still active
    if (daysLeft <= 0 && status === 'active') {
      status = 'expired';
      await User.findByIdAndUpdate(userId, { subscriptionStatus: 'expired' });
    }
  }

  const pendingPayment = await Payment.findOne({ tenantId, status: 'pending' });

  return {
    status,
    daysLeft,
    subscriptionStartDate: (user as any).subscriptionStartDate,
    subscriptionEndDate: endDate,
    hasPendingPayment: !!pendingPayment,
  };
};

export const PaymentService = {
  submitPayment,
  getMyPayments,
  getAllPayments,
  approvePayment,
  rejectPayment,
  getSubscriptionStatus,
};
