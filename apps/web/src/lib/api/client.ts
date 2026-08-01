import type { PublicError } from "@songfest/shared";

export class ApiError extends Error {
  constructor(
    public readonly code: PublicError["error"]["code"],
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const readCookie = (name: string) => {
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);

  return value === undefined ? undefined : decodeURIComponent(value);
};

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  csrfCookie?: "songfest_admin_csrf" | "songfest_guest_csrf";
}

export const apiRequest = async <ResponseBody>(
  path: string,
  { body, csrfCookie, headers, ...options }: ApiRequestOptions = {},
) => {
  const csrfToken = csrfCookie === undefined ? undefined : readCookie(csrfCookie);
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(csrfToken === undefined ? {} : { "X-CSRF-Token": csrfToken }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 204) {
    return undefined as ResponseBody;
  }

  const payload = (await response.json()) as ResponseBody | PublicError;
  if (!response.ok) {
    const publicError = payload as PublicError;
    throw new ApiError(publicError.error.code, publicError.error.message, response.status);
  }

  return payload as ResponseBody;
};
