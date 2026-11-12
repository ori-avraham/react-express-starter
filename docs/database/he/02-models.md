# 2. מודלים: תכנון האוספים שלכם

[→ מושגים](01-how-the-database-works.md) · [הבא: שאילתות ←](03-queries.md) · [English](../en/02-models.md)

**מודל** מתאר אוסף אחד. כל מודל נמצא בקובץ משלו בתיקייה `backend/src/models/`.

## דוגמה מלאה: `models/note.model.js`

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

שורה אחר שורה:

| קוד | משמעות |
| --- | ------ |
| `new mongoose.Schema({...}, {...})` | השדות (האובייקט הראשון) וההגדרות (האובייקט השני) |
| `type: String` | הטיפוס של השדה |
| `required: true` | שמירה בלי השדה הזה נכשלת |
| `trim: true` | רווחים בהתחלה ובסוף מוסרים |
| `default: ""` | הערך שנשמר כשהשדה לא נשלח |
| `enum: NOTE_STATUSES` | רק הערכים האלה מותרים |
| `ref: "User"` | השדה מכיל id של מסמך במודל `User` |
| `{ timestamps: true }` | מוסיף `createdAt` ו־`updatedAt`, שמתעדכנים אוטומטית |
| `noteSchema.index(...)` | כלל על כמה שדות יחד (ראו [אינדקסים](#אינדקסים)) |
| `mongoose.model("Note", noteSchema)` | יוצר את המודל. שם האוסף הוא צורת הרבים באותיות קטנות: `notes` |
| `import "./user.model.js"` | מוודא שהמודל `User` קיים, כדי ש־`.populate("owner")` יעבוד |

## טיפוסי שדות

| טיפוס | ערך לדוגמה | הערות |
| ----- | ---------- | ----- |
| `String` | `"Projector broken"` | אפשרויות: `trim`, `minLength`, `maxLength`, `lowercase`, `enum` |
| `Number` | `3` | אפשרויות: `min`, `max` |
| `Boolean` | `true` | מתאים לדגלים כמו `isActive` |
| `Date` | `2026-12-01T10:00:00.000Z` | מקבל `Date` או מחרוזת כמו `"2026-12-01"` |
| `mongoose.Schema.Types.ObjectId` | `ObjectId("6aef...")` | הפניה למסמך אחר, יחד עם `ref` |
| `[String]` | `["urgent", "room-12"]` | מערך של ערכים |

### תאריכים

תאריכים נשמרים ב־**UTC**. מחרוזת של תאריך בלבד כמו `"2026-12-01"` (מה ש־
`<input type="date">` שולח) נשמרת כחצות UTC: `2026-12-01T00:00:00.000Z`.
להצגה השתמשו ב־`formatDate()` מתוך `frontend/src/lib/format.js`, ולמילוי שדה
תאריך השתמשו ב־`toDateInputValue()`.

לתאריך **ושעה** (הזמנות, אירועים) השתמשו ב־`<input type="datetime-local">`
וב־`z.iso.datetime({ local: true })` של Zod.

## מטבלה בהנחיות למודל

לוקחים את הטבלה מההנחיות ומתרגמים כל עמודה:

**בהנחיות (LabSlot):** `reservations: id, user_id, equipment_id, start_time, end_time, status`

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

מוסכמות:

- **אל** תוסיפו שדה `id`, כי `_id` נוצר אוטומטית.
- קראו להפניות בשם הדבר ולא בשם העמודה: `user` ולא `user_id`. אחרי
  `.populate("user")` השדה מכיל את המשתמש כולו, ולכן `user` קריא יותר.
- השתמשו ב־**camelCase**: `startTime` ולא `start_time`.
- במקום `created_at` משתמשים ב־`{ timestamps: true }`.
- שם המודל הוא **ביחיד ובאות גדולה** (`Reservation`), והאוסף ייקרא
  `reservations`.

## קשרים

### אחד־לרבים: "לפתק יש בעלים אחד, למשתמש יש הרבה פתקים"

שומרים את ה־id בצד של ה**רבים**:

```js
// note.model.js
owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
```

כדי לקבל את הפתקים של משתמש: `Note.find({ owner: userId })`.
כדי לקבל פתק יחד עם הבעלים שלו: `Note.findById(id).populate("owner", "name email")`.

עוד דוגמאות מההנחיות:

| צד הרבים | שדה | מצביע על |
| -------- | --- | -------- |
| `Issue` (FixTrack) | `room` | `Room` |
| `IssueUpdate` (FixTrack) | `issue` | `Issue` |
| `Loan` (BoxBack) | `customer` | `Customer` |
| `Incident` (ShiftNote) | `createdBy`, `assignedTo` | `User` (פעמיים!) |

### רבים־לרבים: "הרבה משתמשים בהרבה אירועים"

משתמשים ב**אוסף נפרד באמצע**, בדיוק כמו טבלת `assignments` בהנחיות של
CrewCheck:

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

האוסף שבאמצע יכול לשמור גם מידע על הקשר עצמו (`responseStatus`), ולכן הוא
עדיף על מערך של ids.

### ומה עם שמירת אובייקטים בתוך אובייקטים?

MongoDB יכול גם **להטמיע** מסמכים (למשל מערך עדכונים בתוך ליקוי). בפרויקט
שלכם **השתמשו באוספים נפרדים, כמו הטבלאות בהנחיות**. קל יותר לשלוף מהם, הם
מתאימים ל־ERD שתשרטטו, והם תואמים לתכנון שבהנחיות.

## משתמשים: `models/user.model.js`

האוסף `user` שייך ל־Better Auth. המודל הקטן הזה קיים רק כדי שמודלים אחרים
יוכלו להפנות למשתמשים ולהשתמש ב־`.populate()`:

```js
const userSchema = new mongoose.Schema(
  { name: String, email: String, role: String },
  { collection: "user" },
);

export const User = mongoose.model("User", userSchema);
```

- `{ collection: "user" }` אומר ל־Mongoose את שם האוסף המדויק (Better Auth
  משתמשת ב־`user` ולא ב־`users`).
- **לקריאה בלבד.** לעולם אל תיצרו או תעדכנו משתמשים דרך המודל הזה. השתמשו
  ב־Better Auth (`auth.api.createUser`, תוסף ה־admin). ראו
  [מדריך ההזדהות](../../auth/README.md).
- אל תוסיפו כאן שדות בציפייה שיישמרו, כי Better Auth לא תמלא אותם.

## אינדקסים

**אינדקס** מאיץ חיפוש לפי שדה, ו**אינדקס ייחודי** אוסר כפילויות.

```js
// One field: no two pieces of equipment with the same name
name: { type: String, required: true, unique: true },

// Several fields together: a user can't have two notes with the same title
// (but two different users can)
noteSchema.index({ owner: 1, title: 1 }, { unique: true });
```

כשאינדקס ייחודי מופר, MongoDB זורק שגיאה `E11000`, ו־`onError` עונה **409**
עם ההודעה "A record with the same ... already exists."

> **`unique` הוא לא בדיקת תקינות.** הוא יוצר אינדקס ב־MongoDB. אינדקסים נבנים
> כשהאפליקציה עולה (וגם ב־`npm run seed`). אם באוסף כבר יש כפילויות, אי אפשר
> לבנות את האינדקס. אפסו עם `npm run seed`.

## השוואת מזהים

הבאג הנפוץ ביותר בפרויקט:

```js
note.owner === req.user.id                  // ❌ always false: ObjectId vs string
note.owner.toString() === req.user.id       // ✅
note.owner.equals(req.user.id)              // ✅ ObjectId has an equals() method
```

אחרי `.populate("owner")`, `note.owner` הוא מסמך משתמש שלם, ולכן משתמשים
ב־`note.owner._id.toString()` (או ב־`note.owner.id`).

## לוגיקה עסקית לא נכנסת למודלים

המודלים מתארים רק **מה נשמר ואת הכללים הבסיסיים שלו**. כללים שצריכים את
המשתמש הנוכחי או מסמכים אחרים ("אין הזמנות חופפות", "רק הבעלים") נכתבים
ב־**controller**. ראו [business-rules.md](../../business-rules.md).

## רשימת בדיקה למודל חדש

- [ ] קובץ `models/<thing>.model.js`, ושם המודל ביחיד ובאות גדולה
- [ ] `required` על כל שדה שחייב להיות קיים
- [ ] `enum` לסטטוסים ולסוגים, ו־`default` לערך ההתחלתי
- [ ] הפניות כ־`ObjectId` + `ref`, בשם הדבר (`room` ולא `room_id`)
- [ ] `{ timestamps: true }`
- [ ] אינדקסים ייחודיים לכללים של "בלי כפילויות"
- [ ] המודל נוסף ל־`appModels` ב־`seed.js`
