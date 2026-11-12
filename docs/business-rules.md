# Business rule recipes

Every project has rules beyond "save and show": *no overlapping bookings*,
*only once*, *only the owner*... These rules **must be checked on the
server**. A check in React only improves the user experience; anyone can
bypass it by calling the API directly.

When a rule is broken, stop with a clear message:

```js
throw httpError(409, "This equipment is already booked at that time.");
```

| Status | Use it when                                                    |
| ------ | -------------------------------------------------------------- |
| 400    | The data itself is wrong (end before start, negative quantity) |
| 403    | The user is not allowed (wrong role, not the owner)            |
| 404    | The thing does not exist                                       |
| 409    | The request conflicts with the current state (already taken, already returned, overlap) |

---

## 1. Only some roles can do something

> *"Only a manager can create an event."* (CrewCheck) · *"Only maintenance staff can change an issue's status."* (FixTrack)

Use `requireRole` in the router:

```js
eventsRouter.post("/", requireRole(ROLES.MANAGER), validate("body", createEventBody), createEvent);
```

If only **part** of an endpoint is restricted (anyone can add a comment, but
only maintenance can change the status), check in the controller:

```js
if (req.valid.body.newStatus && req.user.role !== ROLES.MAINTENANCE) {
  throw httpError(403, "Only maintenance staff can change the status.");
}
```

## 2. Only the owner (or a manager)

> *"A student may cancel only their own reservation."* (LabSlot) · *"A crew member can respond only to their own assignment."* (CrewCheck)

```js
const reservation = await Reservation.findById(req.valid.params.id);
if (!reservation) throw httpError(404, "Reservation not found.");

if (reservation.user.toString() !== req.user.id) {
  throw httpError(403, "You can only cancel your own reservations.");
}
```

`reservation.user` is an ObjectId, `req.user.id` is a string: compare with
`.toString()`. See `findAccessibleNote()` in `notes.controller.js` for a
version that also allows managers.

## 3. Users see only their own data

> *"A worker sees incidents assigned to them or created by them; the shift lead sees all."* (ShiftNote)

Build the filter based on the role:

```js
const filter = {};
if (req.user.role !== ROLES.SHIFT_LEAD) {
  filter.$or = [{ createdBy: req.user.id }, { assignedTo: req.user.id }];
}
const incidents = await Incident.find(filter);
```

## 4. The server decides some fields

> *"A new incident opens with status open."* (ShiftNote, FixTrack)

Never take these from the client. Leave them out of the Zod schema and set them
in the controller:

```js
const issue = await Issue.create({
  ...req.valid.body,
  reporter: req.user.id,
  status: "open",
});
```

## 5. One field must come after another

> *"The expected return date cannot be before the loan date."* (BoxBack) · *"End time must be after start time."* (LabSlot)

Use `.refine()` on the Zod schema. `path` decides which field shows the error:

```js
export const createReservationBody = z
  .object({
    equipmentId: z.string(),
    startTime: z.iso.datetime({ local: true }),
    endTime: z.iso.datetime({ local: true }),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });
```

`<input type="datetime-local">` sends `"2026-12-01T10:00"`, which is what
`z.iso.datetime({ local: true })` accepts. For date only (`<input type="date">`),
use `z.iso.date()`.

Simple number rules need no refine: `quantity: z.number().int().positive("Quantity must be positive.")`.
In the form, convert the input first: `field.handleChange(Number(event.target.value))`.

## 6. No overlapping time ranges

> *"Two active reservations for the same equipment must not overlap."* (LabSlot)

Two ranges overlap when **each one starts before the other ends**:

```js
const overlapping = await Reservation.findOne({
  equipment: equipmentId,
  status: "active",
  startTime: { $lt: endTime },
  endTime: { $gt: startTime },
});

if (overlapping) {
  throw httpError(409, "This equipment is already booked at that time.");
}

await Reservation.create({ ...req.valid.body, user: req.user.id, status: "active" });
```

Ranges that touch (one ends at 10:00, the next starts at 10:00) do **not**
overlap, because `$lt`/`$gt` are strict.

## 7. Something can happen only once (first come, first served)

> *"A post that was already claimed by another collector cannot be claimed."* (FoodBridge)

The simple version (find, check, save) has a hidden bug: two people clicking
at the same moment can both pass the check. Instead, **check and update in one
atomic operation**:

```js
const post = await FoodPost.findOneAndUpdate(
  { _id: req.valid.params.id, status: "available", pickupUntil: { $gt: new Date() } },
  { status: "claimed", claimedBy: req.user.id, claimedAt: new Date() },
  { returnDocument: "after" }, // return the updated document
);

if (!post) {
  // Either it does not exist, it was already claimed, or it expired.
  throw httpError(409, "This post is no longer available.");
}
```

The same pattern works for *"a loan that was returned cannot be returned again"* (BoxBack):

```js
const loan = await Loan.findOneAndUpdate(
  { _id: id, returnedAt: null },
  { returnedAt: new Date(), status: "returned" },
  { returnDocument: "after" },
);
if (!loan) throw httpError(409, "This loan was already returned.");
```

## 8. No duplicates

> *"The same crew member cannot be assigned twice to the same event."* (CrewCheck)

Let MongoDB enforce it with a **unique compound index** on the model:

```js
assignmentSchema.index({ event: 1, user: 1 }, { unique: true });
```

A duplicate insert throws, and `onError` answers **409** automatically. The
Notes example uses this for "one title per user".

Remember to add the model to `appModels` in `seed.js` so the index is created
after a reset.

## 9. Inactive or expired things are not available

> *"Inactive equipment is not available for new reservations."* (LabSlot) · *"An expired post cannot be claimed."* (FoodBridge)

Load the related document and check it before creating:

```js
const equipment = await Equipment.findById(equipmentId);
if (!equipment) throw httpError(404, "Equipment not found.");
if (!equipment.isActive) throw httpError(409, "This equipment is not available.");
```

For lists, filter them out: `FoodPost.find({ status: "available", pickupUntil: { $gt: new Date() } })`.

## 10. Calculated values (late, counts, summaries)

> *"A loan is shown as late when the due date passed and it is still open."* (BoxBack)

Don't store "late" in the database, because it changes by itself as time
passes. Calculate it when reading:

```js
const loans = await Loan.find().populate("customer", "fullName phone").lean();
const now = new Date();
res.json(loans.map((loan) => ({
  ...loan,
  id: loan._id,
  isLate: !loan.returnedAt && loan.dueDate < now,
})));
```

> *"The manager sees how many confirmed, declined, or did not respond."* (CrewCheck)

Count with an aggregation. `getNoteStats()` in `notes.controller.js` is a full example:

```js
const counts = await Assignment.aggregate([
  { $match: { event: new mongoose.Types.ObjectId(eventId) } },
  { $group: { _id: "$responseStatus", count: { $sum: 1 } } },
]);
// -> [{ _id: "confirmed", count: 4 }, { _id: "pending", count: 2 }]
```

## 11. Every change is recorded in a history

> *"Every status change is recorded in the history."* (FixTrack)

Create the history entry in the same controller that makes the change:

```js
issue.status = newStatus;
await issue.save();

await IssueUpdate.create({
  issue: issue._id,
  user: req.user.id,
  note,
  newStatus,
});
```

To show it, load the history with the item:
`IssueUpdate.find({ issue: id }).populate("user", "name").sort({ createdAt: 1 })`.

---

## Testing your rules

For every rule, write down (and try in your `.http` file) at least one request
that **follows** it and one that **breaks** it. Record both in your test
document ([templates/tests.md](templates/tests.md)).
