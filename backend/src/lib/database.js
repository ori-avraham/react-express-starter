import { getLogger } from "@logtape/logtape";
import mongoose from "mongoose";

const logger = getLogger(["app", "database"]);

// Send `id` instead of `_id` and drop `__v` whenever a document is sent as JSON.
mongoose.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

export async function connectDatabase() {
  const uri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/express";

  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}
