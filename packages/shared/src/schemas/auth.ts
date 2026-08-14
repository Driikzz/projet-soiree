import { z } from "zod";

import { uuidSchema } from "./common.js";

export const userLoginRequestSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Saisis ton e-mail ou ton identifiant.")
    .max(254, "Cet identifiant est trop long."),
  password: z
    .string()
    .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
    .max(256, "Le mot de passe est trop long."),
});

export const userRegistrationRequestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Le nom affiché doit contenir au moins 2 caractères.")
    .max(80, "Le nom affiché est trop long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Saisis une adresse e-mail valide.")
    .max(254, "L’adresse e-mail est trop longue."),
  password: z
    .string()
    .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
    .max(256, "Le mot de passe est trop long."),
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
