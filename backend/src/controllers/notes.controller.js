import mongoose from "mongoose";
import { httpError } from "../lib/http-error.js";
import { ROLES } from "../lib/roles.js";
import { Note } from "../models/note.model.js";

// Business rules for notes (all enforced here, on the server):
//  1. A new note always starts as "open".
//  2. Members see only their own notes; managers see everyone's.
//  3. Only the owner or a manager can edit or delete a note.
//  4. Only a manager can archive a note (enforced in the router).
//  5. Archived notes cannot be edited.
//  6. A user cannot have two notes with the same title (unique index).

function isManager(user) {
  return user.role === ROLES.MANAGER;
}

function isOwner(user, note) {
  // note.owner may be an id or a populated user document.
  const ownerId = note.owner._id ?? note.owner;
  return ownerId.toString() === user.id;
}

// Loads a note or throws 404, then checks the signed-in user may access it.
async function findAccessibleNote(id, user) {
  const note = await Note.findById(id).populate("owner", "name email");

  if (!note) {
    throw httpError(404, "Note not found.");
  }

  if (!isManager(user) && !isOwner(user, note)) {
    throw httpError(403, "You can only access your own notes.");
  }

  return note;
}

// GET /api/notes?status=open
export async function listNotes(req, res) {
  const { status } = req.valid.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  // Rule 2
  if (!isManager(req.user)) {
    filter.owner = req.user.id;
  }

  const notes = await Note.find(filter)
    .populate("owner", "name email")
    .sort({ createdAt: -1 });

  res.json(notes);
}

// GET /api/notes/stats -> { open: 3, done: 1, archived: 0, total: 4 }
export async function getNoteStats(req, res) {
  const match = {};

  // Rule 2. Aggregations do not convert strings to ObjectIds for you.
  if (!isManager(req.user)) {
    match.owner = new mongoose.Types.ObjectId(req.user.id);
  }

  const groups = await Note.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const stats = { open: 0, done: 0, archived: 0, total: 0 };
  for (const group of groups) {
    stats[group._id] = group.count;
    stats.total += group.count;
  }

  res.json(stats);
}

// GET /api/notes/:id
export async function getNote(req, res) {
  const note = await findAccessibleNote(req.valid.params.id, req.user);
  res.json(note);
}

// POST /api/notes
export async function createNote(req, res) {
  const note = await Note.create({
    ...req.valid.body,
    owner: req.user.id,
    status: "open", // Rule 1: the client cannot choose the starting status.
  });

  await note.populate("owner", "name email");
  res.status(201).json(note);
}

// PATCH /api/notes/:id
export async function updateNote(req, res) {
  const note = await findAccessibleNote(req.valid.params.id, req.user); // Rule 3

  // Rule 5
  if (note.status === "archived") {
    throw httpError(409, "Archived notes cannot be edited.");
  }

  Object.assign(note, req.valid.body);
  await note.save();

  res.json(note);
}

// PATCH /api/notes/:id/archive (managers only)
export async function archiveNote(req, res) {
  const note = await findAccessibleNote(req.valid.params.id, req.user);

  if (note.status === "archived") {
    throw httpError(409, "This note is already archived.");
  }

  note.status = "archived";
  await note.save();

  res.json(note);
}

// DELETE /api/notes/:id
export async function deleteNote(req, res) {
  const note = await findAccessibleNote(req.valid.params.id, req.user); // Rule 3
  await note.deleteOne();

  res.status(204).end();
}
