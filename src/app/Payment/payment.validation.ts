import { z } from 'zod';

export const createPaymentSchema = z.object({
  body: z.object({
    paymentMedium: z.enum(['bkash', 'nagad', 'rocket', 'bank'], {
      required_error: 'Payment medium is required',
    }),
    amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
    senderNumber: z.string().optional(),
    transactionId: z.string().min(1, 'Transaction ID is required'),
    bankAccountName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranchName: z.string().optional(),
  }),
});

export const approvePaymentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    note: z.string().optional(),
    subscriptionDays: z.number().positive().optional(),
  }),
});

export const rejectPaymentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    note: z.string().optional(),
  }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
