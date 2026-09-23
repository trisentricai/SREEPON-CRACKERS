import { z } from 'zod';

/** Firebase ID token minted by the web/mobile SDK and forwarded by the client. */
const idToken = z.string().trim().min(1).max(8192);

export const loginRequestSchema = z.object({ idToken });

export const registerRequestSchema = z.object({ idToken });

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Provide a valid email address').max(320),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;