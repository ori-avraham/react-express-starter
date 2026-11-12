# 3. שאילתות: קריאה וכתיבה של נתונים

[→ מודלים](02-models.md) · [הבא: נתוני דמו, כלים ושאלות נפוצות ←](04-seed-tools-and-faq.md) · [English](../en/03-queries.md)

כל העבודה מול מסד הנתונים נעשית ב־**controllers** (`backend/src/controllers/`).
כל קריאה ל־Mongoose מחזירה Promise, ולכן תמיד משתמשים ב־`await`.

הדוגמאות משתמשות במודל `Note`. החליפו אותו במודל שלכם.

## יצירה

```js
const note = await Note.create({
  title: "Call the technician",
  owner: req.user.id,   // a string is converted to an ObjectId automatically
});
// note.id, note.status ("open" from the default), note.createdAt...
```

Mongoose מוסיף ערכי ברירת מחדל, בודק את הסכמה ושומר. אם כלל נכשל הוא זורק
שגיאה (400 לבעיית תקינות, 409 לכפילות), ו־`onError` שולח את התשובה.

עונים עם **201 Created**:

```js
res.status(201).json(note);
```

## קריאה של הרבה: `find`

```js
const notes = await Note.find();                          // all
const open = await Note.find({ status: "open" });         // WHERE status = 'open'
const mine = await Note.find({ owner: req.user.id });     // my notes
```

האובייקט שמעבירים הוא ה**מסנן** (filter). כל שדה בו חייב להתאים.

### אופרטורים במסנן

| אופרטור | משמעות | דוגמה |
| ------- | ------ | ----- |
| *(ערך רגיל)* | שווה ל־ | `{ status: "open" }` |
| `$ne` | שונה מ־ | `{ status: { $ne: "archived" } }` |
| `$in` | אחד מתוך | `{ status: { $in: ["open", "done"] } }` |
| `$lt`, `$lte` | קטן מ־ (או שווה) | `{ dueDate: { $lt: new Date() } }` (באיחור) |
| `$gt`, `$gte` | גדול מ־ (או שווה) | `{ quantity: { $gte: 1 } }` |
| `$or` | אחד מהמסננים האלה | `{ $or: [{ createdBy: id }, { assignedTo: id }] }` |
| `$regex` | הטקסט מכיל | `{ title: { $regex: "projector", $options: "i" } }` |
| `null` | חסר או ריק | `{ returnedAt: null }` (עוד לא הוחזר) |

אפשר לשלב ביניהם בחופשיות:

```js
// Open loans whose due date has passed
const late = await Loan.find({ returnedAt: null, dueDate: { $lt: new Date() } });
```

### בניית מסנן שלב אחר שלב

מתוך `listNotes` בקובץ `notes.controller.js`:

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

### מיון, הגבלה ובחירת שדות

```js
const notes = await Note.find(filter)
  .sort({ createdAt: -1 })   // newest first (1 = ascending, -1 = descending)
  .limit(20)                 // at most 20
  .select("title status");   // only these fields (plus _id)
```

## קריאה של מסמך אחד

```js
const note = await Note.findById(req.valid.params.id);
const item = await Equipment.findOne({ name: "Arduino kit #1" });
```

שתיהן מחזירות **`null`** כשאין התאמה. תמיד בדקו:

```js
if (!note) {
  throw httpError(404, "Note not found.");
}
```

אם ה־id הוא לא ObjectId תקין (למשל `/api/notes/abc`), Mongoose זורק
`CastError` ו־`onError` עונה 400. סכמת ה־Zod `noteIdParams` תופסת את זה עוד
קודם.

## Populate: הבאת מסמכים קשורים

השדה `owner` שומר רק id. `.populate()` מחליף אותו במסמך עצמו:

```js
const note = await Note.findById(id).populate("owner", "name email");
```

```js
// without populate                    // with populate
{ title: "...", owner: "6aef...b89" }  { title: "...", owner: { id: "6aef...b89", name: "Dan Member", email: "member@demo.com" } }
```

- הארגומנט השני בוחר אילו שדות להביא. בקשו רק את מה שאתם צריכים.
- populate לכמה שדות: `.populate("room").populate("reporter", "name")`.
- אם המסמך המקושר נמחק, השדה הופך ל־`null`. ב־React השתמשו ב־`note.owner?.name`.

## עדכון

### אפשרות 1: טוענים, משנים, שומרים

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

השתמשו בדרך הזו ברוב המקרים. אפשר לבדוק כל דבר לפני השמירה, ו־`save()` מריץ
את כל כללי הסכמה.

### אפשרות 2: `findOneAndUpdate` (צעד אטומי אחד)

```js
const loan = await Loan.findOneAndUpdate(
  { _id: id, returnedAt: null },                    // filter: find it only if not returned yet
  { returnedAt: new Date(), status: "returned" },   // changes
  { returnDocument: "after", runValidators: true }, // options
);

if (!loan) throw httpError(409, "This loan was already returned.");
```

החיפוש והעדכון קורים **בצעד אחד**, כך ששני משתמשים שלוחצים באותו רגע לא
יכולים להצליח שניהם. השתמשו בזה בכללים של "רק פעם אחת" (שמירת פרסום, החזרת
השאלה). ראו [business-rules.md](../../business-rules.md#7-something-can-happen-only-once-first-come-first-served).

הגדרות שכמעט תמיד כדאי להעביר:

| הגדרה | למה |
| ----- | --- |
| `returnDocument: "after"` | מחזיר את המסמך **אחרי** השינוי. בלי זה מקבלים את הגרסה הישנה. |
| `runValidators: true` | בודק `enum`, `min`... גם בשינוי. **בלי זה Mongoose לא בודק עדכונים**, ו־`status: "bogus"` היה נשמר. |

### עדכון של הרבה מסמכים

```js
await Reservation.updateMany(
  { equipment: id, status: "active" },
  { status: "cancelled" },
);
```

## מחיקה

```js
await note.deleteOne();                        // a document you already loaded
await Note.findByIdAndDelete(id);              // by id
await IssueUpdate.deleteMany({ issue: id });   // all matching
```

עונים עם **204 No Content** ובלי גוף:

```js
res.status(204).end();
```

מחיקה לא נוגעת במסמכים קשורים. אם מוחקים ליקוי, מחקו גם את העדכונים שלו
(`deleteMany`), או אל תאפשרו מחיקה.

## ספירה ו־aggregate

```js
const openCount = await Note.countDocuments({ status: "open" });
```

לספירה **לפי קבוצות** משתמשים ב־aggregation, המקבילה של `GROUP BY` ב־SQL.
מתוך `getNoteStats` בקובץ `notes.controller.js`:

```js
const groups = await Note.aggregate([
  { $match: match },                                       // WHERE
  { $group: { _id: "$status", count: { $sum: 1 } } },     // GROUP BY status, COUNT(*)
]);
// → [{ _id: "open", count: 4 }, { _id: "done", count: 1 }]
```

aggregation היא רשימה של **שלבים** (stages), וכל שלב מעביר את התוצאה שלו לשלב
הבא.

> **aggregate לא ממיר טיפוסים.** ב־`find()`, Mongoose הופך את המחרוזת
> `req.user.id` ל־ObjectId בשבילכם. ב־`aggregate()` הוא לא עושה את זה, והשאילתה
> פשוט מחזירה תוצאה ריקה בלי שגיאה. המירו בעצמכם:
>
> ```js
> { $match: { owner: new mongoose.Types.ObjectId(req.user.id) } }
> ```

## `lean()`: אובייקטים פשוטים

```js
const loans = await Loan.find().lean();
```

`.lean()` מחזיר אובייקטי JavaScript פשוטים במקום מסמכי Mongoose. זה מהיר יותר,
ושימושי כשרוצים **להוסיף שדות מחושבים** לפני השליחה:

```js
const now = new Date();
res.json(loans.map((loan) => ({
  ...loan,
  id: loan._id,
  isLate: !loan.returnedAt && loan.dueDate < now,
})));
```

שני דברים שחשוב לדעת על אובייקטי lean:

- יש להם **`_id` ולא `id`**, כי הגדרת ה־`toJSON` הגלובלית לא חלה עליהם. הוסיפו
  `id: loan._id` בעצמכם, כמו בדוגמה.
- אין להם `.save()`. השתמשו בהם רק לקריאה.

## דף עזר

| SQL | Mongoose |
| --- | -------- |
| `INSERT INTO notes ...` | `Note.create({...})` |
| `SELECT * FROM notes` | `Note.find()` |
| `SELECT * FROM notes WHERE status = 'open'` | `Note.find({ status: "open" })` |
| `... ORDER BY created_at DESC LIMIT 10` | `.sort({ createdAt: -1 }).limit(10)` |
| `SELECT * FROM notes WHERE id = ?` | `Note.findById(id)` |
| `... JOIN users ON ...` | `.populate("owner", "name")` |
| `UPDATE notes SET ... WHERE id = ?` | טעינה + `Object.assign` + `save()`, או `findOneAndUpdate` |
| `DELETE FROM notes WHERE id = ?` | `Note.findByIdAndDelete(id)` |
| `SELECT COUNT(*) ... WHERE ...` | `Note.countDocuments({...})` |
| `SELECT status, COUNT(*) ... GROUP BY status` | `Note.aggregate([{ $group: ... }])` |
