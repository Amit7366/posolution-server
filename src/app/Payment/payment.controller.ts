import httpStatus from 'http-status';
import catchAsync from '../utilis/catchAsync';
import sendResponse from '../utilis/sendResponse';
import { PaymentService } from './payment.service';

export const PaymentController = {
  submit: catchAsync(async (req, res) => {
    const { objectId, tenantId } = req.user as any;
    const result = await PaymentService.submitPayment(objectId, tenantId, req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Payment submitted successfully',
      data: result,
    });
  }),

  getMyPayments: catchAsync(async (req, res) => {
    const { tenantId } = req.user as any;
    const result = await PaymentService.getMyPayments(tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payments retrieved',
      data: result,
    });
  }),

  getAllPayments: catchAsync(async (req, res) => {
    const result = await PaymentService.getAllPayments(req.query as Record<string, unknown>);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'All payments retrieved',
      data: result.data,
      meta: result.meta,
    });
  }),

  approvePayment: catchAsync(async (req, res) => {
    const { objectId } = req.user as any;
    const { id } = req.params;
    const { note, subscriptionDays } = req.body;
    const result = await PaymentService.approvePayment(id, objectId, note, subscriptionDays);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment approved and subscription activated',
      data: result,
    });
  }),

  rejectPayment: catchAsync(async (req, res) => {
    const { objectId } = req.user as any;
    const { id } = req.params;
    const { note } = req.body;
    const result = await PaymentService.rejectPayment(id, objectId, note);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Payment rejected',
      data: result,
    });
  }),

  getSubscriptionStatus: catchAsync(async (req, res) => {
    const { objectId, tenantId } = req.user as any;
    const result = await PaymentService.getSubscriptionStatus(objectId, tenantId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Subscription status retrieved',
      data: result,
    });
  }),
};
