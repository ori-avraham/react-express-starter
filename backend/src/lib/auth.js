import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { ADMIN_ROLES, authRoles, DEFAULT_ROLE } from "./roles.js";

const databaseUrl =
  process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/express";
const mongoClient = new MongoClient(databaseUrl);
const database = mongoClient.db();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

export const auth = betterAuth({
  database: mongodbAdapter(database),
  trustedOrigins: [clientUrl],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    adminPlugin({
      roles: authRoles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ADMIN_ROLES,
    }),
  ],
});
