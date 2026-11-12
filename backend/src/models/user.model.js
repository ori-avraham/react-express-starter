import mongoose from "mongoose";

// Better Auth creates and manages the "user" collection (sign-up, roles,
// passwords). Never create or update users through this model; use Better
// Auth instead. It exists so other models can reference users with
// `ref: "User"` and load them with `.populate("owner", "name email")`.
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    role: String,
  },
  { collection: "user" },
);

export const User = mongoose.model("User", userSchema);
