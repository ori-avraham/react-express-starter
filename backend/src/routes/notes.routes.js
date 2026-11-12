import { Router } from "express";
import {
  archiveNote,
  createNote,
  deleteNote,
  getNote,
  getNoteStats,
  listNotes,
  updateNote,
} from "../controllers/notes.controller.js";
import { ROLES } from "../lib/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createNoteBody,
  listNotesQuery,
  noteIdParams,
  updateNoteBody,
} from "../schemas/note.schemas.js";

// Mounted at /api/notes in app.js. Reading this file should tell you
// every endpoint, who may call it, and what data it expects.
export const notesRouter = Router();

// Every notes endpoint requires a signed-in user.
notesRouter.use(requireAuth);

notesRouter.get("/", validate("query", listNotesQuery), listNotes);

// Must come before "/:id", otherwise "stats" would be treated as an id.
notesRouter.get("/stats", getNoteStats);

notesRouter.get("/:id", validate("params", noteIdParams), getNote);

notesRouter.post("/", validate("body", createNoteBody), createNote);

notesRouter.patch(
  "/:id",
  validate("params", noteIdParams),
  validate("body", updateNoteBody),
  updateNote,
);

notesRouter.patch(
  "/:id/archive",
  requireRole(ROLES.MANAGER),
  validate("params", noteIdParams),
  archiveNote,
);

notesRouter.delete("/:id", validate("params", noteIdParams), deleteNote);
