import { z } from 'zod';
import { bdPhoneZod } from '../utilis/phone';

const loginValidationSchema = z.object({
  body: z
    .object({
      id: z.string().optional(),
      email: z.string().email().optional(),
      username: z.string().min(3).optional(),
      contactNo: z.string().optional(),
      password: z.string({ required_error: 'Password is required' }),
    })
    .superRefine((data, ctx) => {
      const identifiers = [data.id, data.email, data.username, data.contactNo].filter(
        (v) => typeof v === 'string' && v.trim().length > 0,
      );

      if (identifiers.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide exactly one of email, username, or phone number',
          path: ['email'],
        });
        return;
      }

      if (data.contactNo) {
        const parsed = bdPhoneZod.safeParse(data.contactNo);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: parsed.error.issues[0]?.message || 'Invalid phone number',
            path: ['contactNo'],
          });
        }
      }
    }),
});

const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required!',
    }),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z.string({
      required_error: 'Old password is required',
    }),
    newPassword: z.string({ required_error: 'Password is required' }),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required!',
    }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'User id is required!',
    }),
    newPassword: z.string({
      required_error: 'User password is required!',
    }),
  }),
});

export const AuthValidation = {
  loginValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
  forgetPasswordValidationSchema,
  resetPasswordValidationSchema,
};
