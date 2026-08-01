import { z } from "zod";

import { uuidSchema } from "./common.js";

export const adminLoginRequestSchema = z.object({
  username: z.string().trim().min(3).max(64),
  password: z.string().min(12).max(256),
});

export const adminSessionSchema = z.object({
  admin: z.object({
    id: uuidSchema,
    username: z.string(),
  }),
});

export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminSession = z.infer<typeof adminSessionSchema>;
