import { getLogger } from "@logtape/logtape";
import mongoose from "mongoose";
import * as z from "zod";

const logger = getLogger(["app", "error"]);

// Every error response has the same shape:
//   { message: "Something readable", errors?: { field: ["problem", ...] } }
export function onError(error, _req, res, _next) {
  // Request data failed a Zod schema (see middleware/validate.js).
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Some fields are invalid.",
      errors: z.flattenError(error).fieldErrors,
    });
  }

  // A Mongoose schema rule failed (required, enum, min...).
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = {};
    for (const [field, fieldError] of Object.entries(error.errors)) {
      errors[field] = [fieldError.message];
    }
    return res
      .status(400)
      .json({ message: "Some fields are invalid.", errors });
  }

  // A value could not be converted, usually a malformed id in the URL.
  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${error.path}.` });
  }

  // A unique index was violated.
  if (error.code === 11000) {
    const fields = Object.keys(error.keyValue || {}).join(", ");
    return res.status(409).json({
      message: `A record with the same ${fields} already exists.`,
    });
  }

  const responseStatus = res.statusCode < 400 ? 500 : res.statusCode;
  const status = error.status || error.statusCode || responseStatus || 500;

  if (status >= 500) {
    logger.error("Unhandled error: {message}", {
      message: error.message,
      error,
    });
  }

  res.status(status).json({
    message: error.message || "Internal Server Error",
    // Stack traces help debug crashes in development; never leak them in production.
    stack:
      status >= 500 && process.env.NODE_ENV !== "production"
        ? error.stack
        : undefined,
  });
}
