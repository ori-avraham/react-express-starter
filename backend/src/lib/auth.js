import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { MongoClient } from "mongodb";

const databaseUrl =
  process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/express_dev";
const mongoClient = new MongoClient(databaseUrl);
const database = mongoClient.db();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

export const auth = betterAuth({
  database: mongodbAdapter(database),
  trustedOrigins: [clientUrl],
  emailAndPassword: {
    enabled: true,
  },
});
