import { rateLimit } from "express-rate-limit";

import { AppError } from "../errors/app-error.js";

export const createRateLimiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, _response, next) => {
      next(new AppError(429, "RATE_LIMITED", "Trop de tentatives. Réessaie dans un instant."));
    },
  });
