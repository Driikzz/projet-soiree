import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error.js";
import { logger } from "../lib/logger.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Cette route n’existe pas.",
      requestId: request.id,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Certaines informations sont invalides.",
        requestId: request.id,
        details: {
          fields: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
    });
    return;
  }

  if (error instanceof AppError) {
    logger.warn(
      {
        code: error.code,
        requestId: request.id,
        method: request.method,
        path: request.path,
      },
      "Request rejected",
    );
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: request.id,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  logger.error(
    {
      error,
      requestId: request.id,
      method: request.method,
      path: request.path,
    },
    "Unhandled request error",
  );

  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Une erreur inattendue est survenue.",
      requestId: request.id,
    },
  });
};
