import { getLogger } from "@logtape/logtape";

const logger = getLogger(["app", "error"]);

export function onError(error, _req, res, _next) {
  const responseStatus = res.statusCode < 400 ? 500 : res.statusCode;
  const status = error.status || error.statusCode || responseStatus || 500;

  if (responseStatus >= 500) {
    logger.error("Unhandled error: {message}", {
      message: error.message,
      error,
    });
  }

  res.status(status).json({
    message: error.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  });
}
