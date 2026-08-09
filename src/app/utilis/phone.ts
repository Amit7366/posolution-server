import { z } from 'zod';

/** Normalize BD mobile to E.164: +8801XXXXXXXXX */
export function normalizeBdPhone(input: string): string {
  const digits = String(input || '').replace(/\D/g, '');

  let national = digits;
  if (national.startsWith('880')) {
    national = national.slice(3);
  }
  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  return `+880${national}`;
}

/** Valid BD mobile after +880: 10 digits starting with 1 */
export function isValidBdPhone(input: string): boolean {
  const normalized = normalizeBdPhone(input);
  return /^\+8801\d{9}$/.test(normalized);
}

export const bdPhoneZod = z
  .string({ required_error: 'Phone number is required' })
  .min(1, 'Phone number is required')
  .refine((v) => isValidBdPhone(v), {
    message: 'Enter a valid Bangladesh mobile number',
  })
  .transform((v) => normalizeBdPhone(v));
