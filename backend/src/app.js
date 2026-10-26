import { expressLogger } from "@logtape/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { auth } from "./lib/auth.js";
import { notFound } from "./middleware/not-found.js";
import { onError } from "./middleware/on-error.js";

const app = express();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(expressLogger({ format: "dev" }));
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
app.use(helmet());

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to the Express basics demo" });
});

// Better Auth must receive the raw request body before express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use(notFound);
app.use(onError);

export default app;
