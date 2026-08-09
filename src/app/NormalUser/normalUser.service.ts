import httpStatus from 'http-status';
import mongoose from 'mongoose';

import AppError from '../errors/AppError';
import { User } from '../User/user.model';
import QueryBuilder from '../builder/QueryBuilder';
import { NormalUser } from './normalUser.model';
import { NormalUserSearchableFields } from './normalUser.constant';
import { TNormalUser } from './normalUser.interface';

const getAllNormalUsersFromDB = async (query: Record<string, unknown>) => {
  const normalUserQuery = new QueryBuilder(
    NormalUser.find({ isDeleted: false }).select(
      '_id id user designation name country device gender dateOfBirth email contactNo emergencyContactNo bloodGroup presentAddress permanentAddress profileImg isDeleted'
    ), // Select specific fields and filter by isDeleted
    query
  )
    .search(NormalUserSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await normalUserQuery.modelQuery;
  const meta = await normalUserQuery.countTotal();
  console.log(meta);
  return {
    result,
    meta,
  };
};

const getSingleNormalUserFromDB = async (id: string) => {
  const result = await NormalUser.findOne({ user: id, isDeleted: false });
  return result;
};

const getMyNormalUserFromDB = async (userObjectId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userObjectId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user ID format');
  }

  const result = await NormalUser.findOne({
    user: new mongoose.Types.ObjectId(userObjectId),
    isDeleted: false,
  }).populate({
    path: 'user',
    select: 'username email role tenantId',
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found');
  }

  return result;
};

const updateNormalUserIntoDB = async (
  userId: string,
  payload: Partial<TNormalUser>,
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user ID format');
  }
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const result = await NormalUser.findOneAndUpdate(
    { user: userObjectId, isDeleted: false },
    payload,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found');
  }

  return result;
};

const deleteNormalUserFromDB = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const deletedNormalUser = await NormalUser.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, session },
    );

    if (!deletedNormalUser) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to delete normal user',
      );
    }

    // get user _id from deletedNormalUser
    const userId = deletedNormalUser.user;

    const deletedUser = await User.findByIdAndDelete(userId, { session });

    if (!deletedUser) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete user');
    }

    await session.commitTransaction();
    await session.endSession();

    return deletedNormalUser;
  } catch (err: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(err);
  }
};

export const NormalUserServices = {
  getAllNormalUsersFromDB,
  getSingleNormalUserFromDB,
  getMyNormalUserFromDB,
  updateNormalUserIntoDB,
  deleteNormalUserFromDB,
};
