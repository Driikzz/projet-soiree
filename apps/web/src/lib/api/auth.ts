import type { AdminLoginRequest, AdminSession } from "@songfest/shared";

import { apiRequest } from "./client";

export const loginAdmin = (input: AdminLoginRequest) =>
  apiRequest<AdminSession>("/api/admin/auth/login", {
    method: "POST",
    body: input,
  });

export const getAdminSession = (signal?: AbortSignal) =>
  apiRequest<AdminSession>("/api/admin/auth/me", {
    ...(signal === undefined ? {} : { signal }),
  });

export const logoutAdmin = () =>
  apiRequest<void>("/api/admin/auth/logout", {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });
