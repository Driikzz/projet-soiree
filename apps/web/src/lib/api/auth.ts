import type { UserLoginRequest, UserRegistrationRequest, UserSession } from "@songfest/shared";

import { apiRequest } from "./client";

export const loginUser = (input: UserLoginRequest) =>
  apiRequest<UserSession>("/api/auth/login", {
    method: "POST",
    body: input,
  });

export const registerUser = (input: UserRegistrationRequest) =>
  apiRequest<UserSession>("/api/auth/register", {
    method: "POST",
    body: input,
  });

export const getUserSession = (signal?: AbortSignal) =>
  apiRequest<UserSession>("/api/auth/me", {
    ...(signal === undefined ? {} : { signal }),
  });

export const logoutUser = () =>
  apiRequest<void>("/api/auth/logout", {
    method: "POST",
    csrfCookie: "songfest_admin_csrf",
  });
