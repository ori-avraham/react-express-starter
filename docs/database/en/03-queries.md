# 3. Queries: reading and writing data

[← Models](02-models.md) · [Next: seed, tools and FAQ →](04-seed-tools-and-faq.md) · [עברית](../he/03-queries.md)

All database work happens in **controllers** (`backend/src/controllers/`).
Every Mongoose call returns a Promise, so always use `await`.

Examples use the `Note` model; replace it with your own.

## Create

```js
const note = await Note.create({
  title: "Call the technician",
  owner: req.user.id,   // a string is converted to an ObjectId automatically
});
// note.id, note.status ("open" from the default), note.createdAt...
```

Mongoose applies defaults, checks the schema, and saves. If a rule fails it
throws (400 for validation, 409 for a duplicate), and `onError` sends the response.

Respond with **201 Created**:

```js
res.status(201).json(note);
```

## Read many: `find`

```js
const notes = await Note.find();                          // all
const open = await Note.find({ status: "open" });         // WHERE status = 'open'
const mine = await Note.find({ owner: req.user.id });     // my notes
```

The object you pass is the **filter**. Every field in it must match.

### Filter operators

| Operator | Meaning | Example |
| -------- | ------- | ------- |
| *(plain value)* | equals | `{ status: "open" }` |
| `$ne` | not equal | `{ status: { $ne: "archived" } }` |
| `$in` | one of | `{ status: { $in: ["open", "done"] } }` |
| `$lt`, `$lte` | less than (or equal) | `{ dueDate: { $lt: new Date() } }` (overdue) |
| `$gt`, `$gte` | greater than (or equal) | `{ quantity: { $gte: 1 } }` |
| `$or` | any of these filters | `{ $or: [{ createdBy: id }, { assignedTo: id }] }` |
| `$regex` | text contains | `{ title: { $regex: "projector", $options: "i" } }` |
| `null` | missing or empty | `{ returnedAt: null }` (not returned yet) |

Combine them freely:

```js
// Open loans whose due date has passed
const late = await Loan.find({ returnedAt: null, dueDate: { $lt: new Date() } });
```

### Building a filter step by step

From `listNotes` in `notes.controller.js`:

```js
const filter = {};

if (status) {
  filter.status = status;            // only if the user picked a status
}

if (!isManager(req.user)) {
  filter.owner = req.user.id;        // members only see their own
}

const notes = await Note.find(filter);
```

### Sort, limit, choose fields

```js
const notes = await Note.find(filter)
  .sort({ createdAt: -1 })   // newest first (1 = ascending, -1 = descending)
  .limit(20)                 // at most 20
  .select("title status");   // only these fields (plus _id)
```

## Read one

```js
const note = await Note.findById(req.valid.params.id);
const item = await Equipment.findOne({ name: "Arduino kit #1" });
```

Both return **`null`** when nothing matches. Always check:

```js
if (!note) {
  throw httpError(404, "Note not found.");
}
```

If the id isn't a valid ObjectId (e.g. `/api/notes/abc`), Mongoose throws a
`CastError` and `onError` answers 400. The `noteIdParams` Zod schema catches it
even earlier.

## Populate: bring in related documents

`owner` only stores an id. `.populate()` replaces it with the actual document:

```js
const note = await Note.findById(id).populate("owner", "name email");
```

```js
// without populate                    // with populate
{ title: "...", owner: "6aef...b89" }  { title: "...", owner: { id: "6aef...b89", name: "Dan Member", email: "member@demo.com" } }
```

- The second argument chooses which fields to bring. Only ask for what you need.
- Populate several fields: `.populate("room").populate("reporter", "name")`.
- If the referenced document was deleted, the field becomes `null`. Use
  `note.owner?.name` in React.

## Update

### Option 1: load, change, save

```js
const note = await Note.findById(id);
if (!note) throw httpError(404, "Note not found.");

// checks: permissions, business rules...
if (note.status === "archived") {
  throw httpError(409, "Archived notes cannot be edited.");
}

Object.assign(note, req.valid.body);   // copy the new values onto the document
await note.save();                     // validates and saves
res.json(note);
```

Use this most of the time. You can check anything before saving, and `save()`
runs all the schema rules.

### Option 2: `findOneAndUpdate` (one atomic step)

```js
const loan = await Loan.findOneAndUpdate(
  { _id: id, returnedAt: null },                    // filter: find it only if not returned yet
  { returnedAt: new Date(), status: "returned" },   // changes
  { returnDocument: "after", runValidators: true }, // options
);

if (!loan) throw httpError(409, "This loan was already returned.");
```

Finding and updating happen in **one step**, so two users clicking at the same
moment can't both succeed. Use it for "only once" rules (claim a post, return a
loan). See [business-rules.md](../../business-rules.md#7-something-can-happen-only-once-first-come-first-served).

Options you should almost always pass:

| Option | Why |
| ------ | --- |
| `returnDocument: "after"` | Return the document **after** the change. Without it you get the old version. |
| `runValidators: true` | Check `enum`, `min`... on the change. **Without it, Mongoose doesn't validate updates**, so `status: "bogus"` would be saved. |

### Update many

```js
await Reservation.updateMany(
  { equipment: id, status: "active" },
  { status: "cancelled" },
);
```

## Delete

```js
await note.deleteOne();                        // a document you already loaded
await Note.findByIdAndDelete(id);              // by id
await IssueUpdate.deleteMany({ issue: id });   // all matching
```

Respond with **204 No Content** and no body:

```js
res.status(204).end();
```

Deleting doesn't touch related documents. If you delete an issue, delete its
updates too (`deleteMany`), or don't allow deleting.

## Count and aggregate

```js
const openCount = await Note.countDocuments({ status: "open" });
```

For counts **per group**, use an aggregation, the equivalent of SQL's
`GROUP BY`. From `getNoteStats` in `notes.controller.js`:

```js
const groups = await Note.aggregate([
  { $match: match },                                       // WHERE
  { $group: { _id: "$status", count: { $sum: 1 } } },     // GROUP BY status, COUNT(*)
]);
// → [{ _id: "open", count: 4 }, { _id: "done", count: 1 }]
```

An aggregation is a list of **stages**; each stage passes its result to the next.

> **Aggregations don't convert types.** In `find()`, Mongoose turns the string
> `req.user.id` into an ObjectId for you. In `aggregate()` it doesn't, and the
> query silently returns nothing. Convert yourself:
>
> ```js
> { $match: { owner: new mongoose.Types.ObjectId(req.user.id) } }
> ```

## `lean()`: plain objects

```js
const loans = await Loan.find().lean();
```

`.lean()` returns plain JavaScript objects instead of Mongoose documents. It is
faster, and useful when you want to **add calculated fields** before sending:

```js
const now = new Date();
res.json(loans.map((loan) => ({
  ...loan,
  id: loan._id,
  isLate: !loan.returnedAt && loan.dueDate < now,
})));
```

Two things to know about lean objects:

- They have **`_id`, not `id`**, because the global `toJSON` setting doesn't
  apply. Add `id: loan._id` yourself, as above.
- They have no `.save()`. Use them only for reading.

## Cheat sheet

| SQL | Mongoose |
| --- | -------- |
| `INSERT INTO notes ...` | `Note.create({...})` |
| `SELECT * FROM notes` | `Note.find()` |
| `SELECT * FROM notes WHERE status = 'open'` | `Note.find({ status: "open" })` |
| `... ORDER BY created_at DESC LIMIT 10` | `.sort({ createdAt: -1 }).limit(10)` |
| `SELECT * FROM notes WHERE id = ?` | `Note.findById(id)` |
| `... JOIN users ON ...` | `.populate("owner", "name")` |
| `UPDATE notes SET ... WHERE id = ?` | load + `Object.assign` + `save()`, or `findOneAndUpdate` |
| `DELETE FROM notes WHERE id = ?` | `Note.findByIdAndDelete(id)` |
| `SELECT COUNT(*) ... WHERE ...` | `Note.countDocuments({...})` |
| `SELECT status, COUNT(*) ... GROUP BY status` | `Note.aggregate([{ $group: ... }])` |
