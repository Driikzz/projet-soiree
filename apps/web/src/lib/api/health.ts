import { healthResponseSchema, type HealthResponse } from "@songfest/shared";

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch("/api/health", {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error("API_UNAVAILABLE");
  }

  return healthResponseSchema.parse(await response.json());
}
