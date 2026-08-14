import { z } from "zod";

import { uuidSchema } from "./common.js";

export const userLoginRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(12).max(256),
});

export const userRegistrationRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(256),
});

export const userSessionSchema = z.object({
  user: z.object({
    id: uuidSchema,
    displayName: z.string(),
    email: z.string().email().nullable(),
  }),
});

export const adminLoginRequestSchema = userLoginRequestSchema;
export const adminSessionSchema = userSessionSchema;

export type UserLoginRequest = z.infer<typeof userLoginRequestSchema>;
export type UserRegistrationRequest = z.infer<typeof userRegistrationRequestSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type AdminLoginRequest = UserLoginRequest;
export type AdminSession = UserSession;
