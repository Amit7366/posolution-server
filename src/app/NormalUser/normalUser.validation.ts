import { z } from 'zod';
import { BloodGroup, Gender } from './normalUser.constant';
import { bdPhoneZod } from '../utilis/phone';

export const createNormalUserValidationSchema = z.object({
  body: z.object({
    password: z.string().max(20).optional(),
    normalUser: z
      .object({
        name: z.string().min(1).max(40),
        userName: z.string().min(3).max(30).optional(),
        username: z.string().min(3).max(30).optional(),
        gender: z.enum([...Gender] as [string, ...string[]]).optional(),
        dateOfBirth: z.string().optional(),
        email: z.string().email(),
        ip: z.string().optional(),
        device: z.string().optional(),
        deviceFingerprint: z.string().min(1).optional(),
        country: z.string().optional(),
        contactNo: bdPhoneZod,
        emergencyContactNo: z.string().optional(),
        tenantId: z.string().optional(),
        bloodGroup: z.enum([...BloodGroup] as [string, ...string[]]).optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        postalCode: z.string().optional(),
        presentAddress: z.string().optional(),
        permanentAddress: z.string().optional(),
      })
      .superRefine((data, ctx) => {
        if (!data.userName && !data.username) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Username is required',
            path: ['userName'],
          });
        }
      }),
  }),
});

export const updateNormalUserValidationSchema = z.object({
  body: z.object({
    normalUser: z.object({
      name: z.string().min(1).max(40).optional(),
      referralId: z.string().optional(),
      referredBy: z.string().optional(),
      refferCount: z.string().optional(),
      designation: z.string().max(30).optional(),
      gender: z.enum([...Gender] as [string, ...string[]]).optional(),
      dateOfBirth: z.string().optional(),
      email: z.string().email().optional(),
      tenantId: z.string().optional(),
      contactNo: bdPhoneZod.optional(),
      emergencyContactNo: z.string().optional(),
      bloodGroup: z.enum([...BloodGroup] as [string, ...string[]]).optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      presentAddress: z.string().optional(),
      permanentAddress: z.string().optional(),
      profileImg: z.string().url().or(z.literal('')).optional(),
      country: z.string().optional(),
    }),
  }),
});

export const NormalUserValidations = {
  createNormalUserValidationSchema,
  updateNormalUserValidationSchema,
};
