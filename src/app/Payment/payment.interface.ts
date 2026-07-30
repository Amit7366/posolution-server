import { Model, Types } from 'mongoose';

export type TPaymentMedium = 'bkash' | 'nagad' | 'rocket' | 'bank';
export type TPaymentStatus = 'pending' | 'approved' | 'rejected';

export type TPayment = {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  tenantId: string;
  paymentMedium: TPaymentMedium;
  amount: number;
  senderNumber?: string;
  transactionId: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranchName?: string;
  status: TPaymentStatus;
  note?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  subscriptionStart?: Date;
  subscriptionEnd?: Date;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface PaymentModel extends Model<TPayment> {}
