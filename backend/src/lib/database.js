import { getLogger } from "@logtape/logtape";
import mongoose from "mongoose";

const logger = getLogger(["app", "database"]);

export async function connectDatabase() {
  const uri =
    process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/express_dev";

  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}
