import mongoose from "mongoose";
import "./user.model.js";

export const NOTE_STATUSES = ["open", "done", "archived"];

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    status: { type: String, enum: NOTE_STATUSES, default: "open" },
    dueDate: { type: Date, default: null },
    // The user who created the note. Stores the user's id; use
    // .populate("owner", "name email") to load the user itself.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  // Adds createdAt and updatedAt automatically.
  { timestamps: true },
);

// Business rule: a user cannot have two notes with the same title.
// Breaking a unique index makes MongoDB throw, and onError answers 409.
noteSchema.index({ owner: 1, title: 1 }, { unique: true });

export const Note = mongoose.model("Note", noteSchema);
