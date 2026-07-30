import { Schema, model } from 'mongoose';
import { TPayment, PaymentModel } from './payment.interface';

const paymentSchema = new Schema<TPayment, PaymentModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: String, required: true, index: true },
    paymentMedium: {
      type: String,
      enum: ['bkash', 'nagad', 'rocket', 'bank'],
      required: true,
    },
    amount: { type: Number, required: true, min: 1 },
    senderNumber: { type: String },
    transactionId: { type: String, required: true },
    bankAccountName: { type: String },
    bankAccountNumber: { type: String },
    bankName: { type: String },
    bankBranchName: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    note: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    subscriptionStart: { type: Date },
    subscriptionEnd: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

paymentSchema.pre('find', function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});
paymentSchema.pre('findOne', function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

export const Payment = model<TPayment, PaymentModel>('Payment', paymentSchema);
