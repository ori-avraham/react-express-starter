import * as z from "zod";

// Zod schemas describe what the client is allowed to send.
// Used with the validate() middleware; the parsed result is in req.valid.

export const noteIdParams = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid note id."),
});

export const listNotesQuery = z.object({
  status: z.enum(["open", "done", "archived"]).optional(),
});

export const createNoteBody = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(100, "Title must be at most 100 characters."),
  content: z
    .string()
    .trim()
    .max(2000, "Content must be at most 2000 characters.")
    .optional(),
  // "YYYY-MM-DD" (what <input type="date"> sends), or null to clear it.
  dueDate: z.iso.date("Enter a valid date.").nullable().optional(),
});

// Every field is optional when updating. "archived" is not allowed here:
// archiving has its own manager-only endpoint.
export const updateNoteBody = createNoteBody.partial().extend({
  status: z.enum(["open", "done"]).optional(),
});
