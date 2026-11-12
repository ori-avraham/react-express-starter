# 2. Models: designing your collections

[← Concepts](01-how-the-database-works.md) · [Next: queries →](03-queries.md) · [עברית](../he/02-models.md)

A **model** describes one collection. Each model lives in its own file in
`backend/src/models/`.

## A complete example: `models/note.model.js`

```js
import mongoose from "mongoose";
import "./user.model.js";

export const NOTE_STATUSES = ["open", "done", "archived"];

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    status: { type: String, enum: NOTE_STATUSES, default: "open" },
    dueDate: { type: Date, default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

noteSchema.index({ owner: 1, title: 1 }, { unique: true });

export const Note = mongoose.model("Note", noteSchema);
```

Line by line:

| Code | Meaning |
| ---- | ------- |
| `new mongoose.Schema({...}, {...})` | The fields (first object) and options (second object) |
| `type: String` | The field's type |
| `required: true` | Saving without this field fails |
| `trim: true` | Spaces at the start and end are removed |
| `default: ""` | The value used when the field isn't given |
| `enum: NOTE_STATUSES` | Only these values are allowed |
| `ref: "User"` | This field holds the id of a document in the `User` model |
| `{ timestamps: true }` | Adds `createdAt` and `updatedAt`, updated automatically |
| `noteSchema.index(...)` | A rule over several fields (see [Indexes](#indexes)) |
| `mongoose.model("Note", noteSchema)` | Creates the model. The collection name is the plural, lowercase: `notes` |
| `import "./user.model.js"` | Makes sure the `User` model exists so `.populate("owner")` works |

## Field types

| Type | Example value | Notes |
| ---- | ------------- | ----- |
| `String` | `"Projector broken"` | Options: `trim`, `minLength`, `maxLength`, `lowercase`, `enum` |
| `Number` | `3` | Options: `min`, `max` |
| `Boolean` | `true` | Good for flags like `isActive` |
| `Date` | `2026-12-01T10:00:00.000Z` | Accepts a `Date` or a string like `"2026-12-01"` |
| `mongoose.Schema.Types.ObjectId` | `ObjectId("6aef...")` | A reference to another document, with `ref` |
| `[String]` | `["urgent", "room-12"]` | An array of values |

### Dates

Dates are stored in **UTC**. A date-only string like `"2026-12-01"` (what
`<input type="date">` sends) is saved as midnight UTC: `2026-12-01T00:00:00.000Z`.
To show it, use `formatDate()` from `frontend/src/lib/format.js`. To fill a date
input, use `toDateInputValue()`.

For a date **and** time (reservations, events), use
`<input type="datetime-local">` and Zod's `z.iso.datetime({ local: true })`.

## Turning your brief's tables into models

Take the table from your brief and translate each column:

**Brief (LabSlot):** `reservations: id, user_id, equipment_id, start_time, end_time, status`

```js
const reservationSchema = new mongoose.Schema(
  {
    // id → created automatically as _id
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
  },
  { timestamps: true },
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
```

Conventions:

- **Don't** add an `id` field; `_id` is automatic.
- Name references after the thing, not the column: `user`, not `user_id`.
  After `.populate("user")` the field holds the whole user, so `user` reads better.
- Use **camelCase**: `startTime`, not `start_time`.
- `created_at` → use `{ timestamps: true }` instead.
- The model name is **singular and capitalised** (`Reservation`); the collection
  becomes `reservations`.

## Relations

### One-to-many: "a note has one owner, a user has many notes"

Store the id on the **many** side:

```js
// note.model.js
owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
```

To get a user's notes: `Note.find({ owner: userId })`.
To get a note with its owner: `Note.findById(id).populate("owner", "name email")`.

More examples from the briefs:

| Many side | Field | Points to |
| --------- | ----- | --------- |
| `Issue` (FixTrack) | `room` | `Room` |
| `IssueUpdate` (FixTrack) | `issue` | `Issue` |
| `Loan` (BoxBack) | `customer` | `Customer` |
| `Incident` (ShiftNote) | `createdBy`, `assignedTo` | `User` (twice!) |

### Many-to-many: "many users in many events"

Use a **separate collection** in the middle, exactly like the brief's
`assignments` table in CrewCheck:

```js
const assignmentSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    responseStatus: {
      type: String,
      enum: ["pending", "confirmed", "declined"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// The same user can't be assigned twice to the same event.
assignmentSchema.index({ event: 1, user: 1 }, { unique: true });
```

The middle collection can also hold data about the relation itself
(`responseStatus`), which is why it's better than an array of ids.

### What about storing objects inside objects?

MongoDB can also **embed** documents (e.g. an array of updates inside an
issue). For your project, **use separate collections like the tables in your
brief**. They are easier to query, match the ERD you draw, and follow the
brief's design.

## Users: `models/user.model.js`

Better Auth owns the `user` collection. This small model exists only so other
models can reference users and use `.populate()`:

```js
const userSchema = new mongoose.Schema(
  { name: String, email: String, role: String },
  { collection: "user" },
);

export const User = mongoose.model("User", userSchema);
```

- `{ collection: "user" }` tells Mongoose the exact collection name (Better Auth
  uses `user`, not `users`).
- **Read only.** Never create or update users with this model. Use Better Auth
  (`auth.api.createUser`, the admin plugin). See [the auth guide](../../auth/README.md).
- Don't add fields here expecting them to be saved; Better Auth won't fill them.

## Indexes

An **index** makes lookups by a field fast, and a **unique** index forbids
duplicates.

```js
// One field: no two pieces of equipment with the same name
name: { type: String, required: true, unique: true },

// Several fields together: a user can't have two notes with the same title
// (but two different users can)
noteSchema.index({ owner: 1, title: 1 }, { unique: true });
```

When a unique index is broken, MongoDB throws error `E11000`, and `onError`
answers **409** with "A record with the same ... already exists."

> **`unique` is not a validator.** It creates an index in MongoDB. Indexes are
> built when the app starts (and by `npm run seed`). If the collection already
> contains duplicates, the index can't be built. Reset with `npm run seed`.

## Comparing ids

The most common bug in this project:

```js
note.owner === req.user.id                  // ❌ always false: ObjectId vs string
note.owner.toString() === req.user.id       // ✅
note.owner.equals(req.user.id)              // ✅ ObjectId has an equals() method
```

After `.populate("owner")`, `note.owner` is a whole user document, so use
`note.owner._id.toString()` (or `note.owner.id`).

## Business logic does not go in models

Keep models to **what is stored and its basic rules**. Rules that need the
current user or other documents ("no overlapping reservations", "only the
owner") go in the **controller**. See [business-rules.md](../../business-rules.md).

## Checklist for a new model

- [ ] File `models/<thing>.model.js`, model name singular and capitalised
- [ ] `required` on every field that must exist
- [ ] `enum` for statuses and types; `default` for the starting value
- [ ] References as `ObjectId` + `ref`, named after the thing (`room`, not `room_id`)
- [ ] `{ timestamps: true }`
- [ ] Unique indexes for "no duplicates" rules
- [ ] Added to `appModels` in `seed.js`
