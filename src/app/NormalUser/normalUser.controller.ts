import httpStatus from 'http-status';

import catchAsync from '../utilis/catchAsync';
import sendResponse from '../utilis/sendResponse';
import AppError from '../errors/AppError';
import { NormalUserServices } from './normalUser.service';
import { USER_ROLE } from '../User/user.constant';

const getMyNormalUser = catchAsync(async (req, res) => {
  const objectId = req.user?.objectId?.toString();
  if (!objectId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const result = await NormalUserServices.getMyNormalUserFromDB(objectId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile retrieved successfully',
    data: result,
  });
});

const getSingleNormalUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NormalUserServices.getSingleNormalUserFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User is retrieved successfully',
    data: result,
  });
});

const getAllNormalUsers = catchAsync(async (req, res) => {
  const result = await NormalUserServices.getAllNormalUsersFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users are retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const updateNormalUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { normalUser } = req.body;

  const requesterId = req.user?.objectId?.toString();
  const role = req.user?.role;
  const isPrivileged =
    role === USER_ROLE.superAdmin || role === USER_ROLE.admin;

  if (!isPrivileged && requesterId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only update your own profile',
    );
  }

  const result = await NormalUserServices.updateNormalUserIntoDB(
    userId,
    normalUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User is updated successfully',
    data: result,
  });
});

const deleteNormalUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NormalUserServices.deleteNormalUserFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User is deleted successfully',
    data: result,
  });
});

export const NormalUserControllers = {
  getMyNormalUser,
  getAllNormalUsers,
  getSingleNormalUser,
  deleteNormalUser,
  updateNormalUser,
};
