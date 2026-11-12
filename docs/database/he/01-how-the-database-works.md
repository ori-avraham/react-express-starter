# 1. איך עובד מסד הנתונים

[הבא: מודלים ←](02-models.md) · [English](../en/01-how-the-database-works.md)

הדף הזה מסביר את הרעיונות. הדפים הבאים מראים את הקוד.

## MongoDB בתמונה אחת

MongoDB שומר מידע כ**מסמכים** (documents): אובייקטים שנראים כמו JSON. מסמכים
מאותו סוג נמצאים יחד ב**אוסף** (collection). **מסד נתונים** (database) מכיל
אוספים.

```
database "express"
├── collection "user"        ← managed by Better Auth
│     { _id: ObjectId("6aef...b87"), name: "Maya Manager", email: "manager@demo.com", role: "manager" }
│     { _id: ObjectId("6aef...b89"), name: "Dan Member",   email: "member@demo.com",  role: "member" }
│
└── collection "notes"       ← yours
      { _id: ObjectId("6aef...d50"), title: "Buy markers", status: "open", owner: ObjectId("6aef...b89"), ... }
```

## אם אתם מכירים טבלאות SQL

ההנחיות שלכם מדברות על **טבלאות**, **PK** ו־**FK**. כך כל רעיון מתורגם
ל־MongoDB:

| בהנחיות (SQL)               | ב־MongoDB / Mongoose                                       |
| --------------------------- | ---------------------------------------------------------- |
| מסד נתונים                  | מסד נתונים                                                 |
| טבלה (`incidents`)          | אוסף (`incidents`) שמוגדר על ידי **מודל** (`Incident`)     |
| שורה                        | מסמך                                                       |
| עמודה                       | שדה                                                        |
| מפתח ראשי `id` (PK)         | `_id`, נוצר אוטומטית (**ObjectId**)                        |
| מפתח זר (`created_by`)      | שדה מסוג `ObjectId` עם `ref: "User"`                       |
| `NOT NULL`                  | `required: true`                                           |
| `CHECK (status IN (...))`   | `enum: [...]`                                              |
| `DEFAULT 'open'`            | `default: "open"`                                          |
| `UNIQUE`                    | `unique: true` או **אינדקס** ייחודי                        |
| `created_at`                | `{ timestamps: true }` מוסיף `createdAt` ו־`updatedAt`     |
| `JOIN`                      | `.populate()`                                              |
| `SELECT ... WHERE ...`      | `Model.find({ ... })`                                      |
| `GROUP BY` + `COUNT`        | `Model.aggregate([...])`                                   |

כלומר, הטבלאות בהנחיות הופכות לאוספים והעמודות הופכות לשדות. עבודת התכנון
(אילו טבלאות, אילו קשרים) זהה לגמרי, ועדיין משרטטים ERD לספר הפרויקט.

## ObjectId: המזהה של כל מסמך

כל מסמך מקבל `_id` אוטומטית:

```
ObjectId("6aef8ef455dab10df0c77b89")
```

זה רצף של 24 תווים הקסדצימליים, ייחודי בכל מסד הנתונים, ואתם אף פעם לא
יוצרים אותו בעצמכם.

- במסד הנתונים וב־Mongoose הוא **ObjectId**, לא מחרוזת.
- ב־JSON שנשלח ל־frontend הוא הופך ל**מחרוזת** בשדה `id` (ראו "השדה `id`"
  בהמשך).
- גם `req.user.id` שמגיע מ־Better Auth הוא **מחרוזת**.

ההבדל הזה גורם לבאג הנפוץ ביותר בפרויקט, ראו
[02-models.md](02-models.md#השוואת-מזהים).

## Mongoose: השכבה שבין Express ל־MongoDB

MongoDB עצמו מקבל כל מסמך עם כל שדות שהם. **Mongoose** מוסיף כללים מעל:

- **סכמה** (schema) קובעת אילו שדות קיימים, מה הטיפוס שלהם ומה הכללים שלהם
  (חובה, enum, ערך ברירת מחדל...).
- **מודל** (model) הוא האובייקט שבעזרתו קוראים וכותבים לאוסף:
  `Note.find()`, `Note.create()`...
- Mongoose **ממיר** ערכים בשבילכם: המחרוזת `"2026-12-01"` הופכת ל־`Date`,
  והמחרוזת `"6aef..."` הופכת ל־`ObjectId`.

```
Controller ──▶ Note.create({ title, owner }) ──▶ Mongoose checks the schema ──▶ MongoDB stores it
```

## החיבור: `backend/src/lib/database.js`

```js
export async function connectDatabase() {
  const uri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/express";

  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}
```

`index.js` קורא לפונקציה הזו **לפני** שהשרת מתחיל להאזין, כך ששום בקשה לא
מגיעה לפני שמסד הנתונים מוכן.

הכתובת מגיעה מ־`DATABASE_URL` בקובץ `backend/.env`:

```
mongodb://127.0.0.1:27017/express
└─┬───┘   └───┬───┘ └─┬─┘ └──┬──┘
protocol     host    port  database name
```

- שנו את החלק האחרון כדי להשתמש במסד נתונים אחר (למשל `.../labslot`).
- ב־MongoDB Atlas (ענן) הכתובת נראית כך:
  `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/labslot`.
- מסד הנתונים והאוספים שלו נוצרים **אוטומטית** בפעם הראשונה ששומרים בהם
  משהו. אין שלב של `CREATE TABLE`.

### שני חיבורים, מסד נתונים אחד

Better Auth (`lib/auth.js`) פותחת חיבור משלה בעזרת הדרייבר הרשמי `mongodb`,
עם אותו `DATABASE_URL`. שני החיבורים מדברים עם **אותו מסד נתונים**. Better
Auth משתמשת בחיבור שלה עבור `user`, `session` ו־`account`, והמודלים שלכם
משתמשים ב־Mongoose. אין צורך לעשות עם זה שום דבר.

## השדה `id`

ב־`database.js` יש גם את הקוד הזה:

```js
mongoose.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});
```

בכל פעם שמסמך נשלח עם `res.json(...)` הוא מומר ל־JSON. ההגדרה הזו משנה את
ההמרה הזו עבור **כל המודלים**:

| נשמר ב־MongoDB                       | נשלח ל־frontend               |
| ------------------------------------ | ----------------------------- |
| `_id: ObjectId("6aef...")`           | `id: "6aef..."` (מחרוזת)      |
| `__v: 0` (מספר הגרסה של Mongoose)    | מוסר                          |

לכן ב־React כותבים תמיד `note.id` ולא `note._id`. מסמכים שעברו populate (כמו
`note.owner`) מקבלים את אותו טיפול: `note.owner.id`.

## שתי שכבות של בדיקת תקינות

המידע נבדק פעמיים בדרך פנימה:

```
Request body ──▶ Zod (validate middleware) ──▶ Controller ──▶ Mongoose schema ──▶ MongoDB
                 "what the client may send"                    "what may be stored"
```

| | Zod (`schemas/*.schemas.js`) | Mongoose (`models/*.model.js`) |
| --- | --- | --- |
| בודק | את הבקשה מהלקוח | את המסמך לפני השמירה |
| דוגמה | כותרת באורך 3–100 תווים | `title` הוא שדה חובה |
| מכיר | רק את הבקשה | את מסד הנתונים (אינדקסים ייחודיים, הפניות) |
| שגיאה | 400 עם הודעה לכל שדה | 400 (תקינות) או 409 (כפילות) |

Zod תופס קלט שגוי מוקדם, עם הודעות ברורות. Mongoose הוא קו ההגנה האחרון: גם
באג ב־controller לא יוכל לשמור פתק בלי כותרת.

## סיכום

- אוספים מכילים מסמכים, והטבלאות בהנחיות הופכות לאוספים.
- לכל מסמך יש `_id` (ObjectId), וה־frontend רואה אותו כ־`id` (מחרוזת).
- מודלים של Mongoose מגדירים שדות וכללים, ודרכם קוראים וכותבים.
- `DATABASE_URL` בוחר את מסד הנתונים, והאוספים נוצרים אוטומטית.
- Zod בודק את הבקשה, Mongoose בודק את מה שנשמר.
