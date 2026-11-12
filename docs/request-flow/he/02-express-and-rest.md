# 2. Express ו־REST

[→ המסע](01-the-journey.md) · [חזרה לתוכן העניינים](../README.md) · [English](../en/02-express-and-rest.md)

הדף הזה מסביר את אבני הבניין של השרת: middleware, למה הקוד מחולק לתיקיות,
ומוסכמות ה־REST שכל ה־API בפרויקט עוקב אחריהן.

## Middleware: הרעיון המרכזי של Express

**middleware** היא פונקציה שמקבלת את הבקשה ומחליטה מה קורה הלאה:

```js
function myMiddleware(req, res, next) {
  // 1. look at or change req
  // 2. then do ONE of:
  next();                                 //   pass to the next function
  res.status(200).json({ ... });          //   or answer and stop
  throw httpError(403, "Not allowed.");   //   or fail → jump to onError
}
```

| פרמטר | מה זה |
| ----- | ----- |
| `req` | הבקשה: `req.method`, `req.params`, `req.query`, `req.body`, `req.headers`. middleware יכולה להוסיף לה: `req.user`, `req.valid`. |
| `res` | התשובה שאתם בונים: `res.status(201).json(data)`. |
| `next` | "סיימתי, תמשיך." |

controller הוא פשוט ה־middleware **האחרונה**: היא תמיד עונה.

### הסדר חשוב

Express מריץ את ה־middleware לפי הסדר שבו רשמתם אותן, כמו פס ייצור:

```
request → logger → cors → helmet → express.json → router → notFound → onError
                                                      │
                                         requireAuth → validate → controller
```

ולכן:

- `express.json()` חייב להופיע **לפני** ה־routers. אחרת `req.body` יהיה
  `undefined`.
- Better Auth מופיעה **לפני** `express.json()`, כי היא קוראת את הגוף הגולמי
  בעצמה.
- `requireAuth` מופיע **לפני** `requireRole`, כי `requireRole` צריך את
  `req.user`.
- `notFound` מופיע **אחרי** כל הנתיבים: הוא רץ רק אם אף אחד אחר לא ענה.
- `onError` הוא **האחרון**, ויש לו **ארבעה** פרמטרים `(error, req, res, next)`.
  ארבעת הפרמטרים הם הדרך של Express לדעת שזה מטפל שגיאות.

### שגיאות קופצות ישר ל־`onError`

ב־Express 5, אם middleware או controller כלשהו **זורק** שגיאה (או ש־`await`
נכשל), Express מדלג על כל השאר וקורא ל־`onError`. בגלל זה אין
ב־controllers `try/catch`:

```js
export async function getNote(req, res) {
  const note = await Note.findById(req.valid.params.id);   // a DB error → onError (500)
  if (!note) throw httpError(404, "Note not found.");       // → onError (404)
  res.json(note);
}
```

`onError` (`middleware/on-error.js`) הופך כל שגיאה לאותו מבנה JSON, כך
שה־frontend תמיד יודע למה לצפות:

```json
{ "message": "Readable message", "errors": { "field": ["problem"] } }
```

## למה השרת מחולק לתיקיות

כל תיקייה עונה על **שאלה אחת**:

| תיקייה | השאלה שהיא עונה עליה | דוגמה |
| ------ | -------------------- | ----- |
| `routes/` | אילו כתובות קיימות, ומי רשאי לקרוא להן? | `notesRouter.patch("/:id/archive", requireRole(MANAGER), ...)` |
| `schemas/` | אילו נתונים הלקוח רשאי לשלוח? | `title` באורך 3–100 תווים |
| `controllers/` | מה קורה, ואילו כללים עסקיים חלים? | "אי אפשר לערוך פתק בארכיון" |
| `models/` | מה נשמר במסד הנתונים? | ל־`Note` יש `title`, `status`, `owner`... |
| `middleware/` | מה רץ בהרבה נתיבים? | `requireAuth`, `validate`, `onError` |
| `lib/` | הגדרות ופונקציות עזר | `auth.js`, `database.js`, `roles.js`, `http-error.js` |

כשמשהו משתבש, התיקייה אומרת לכם איפה לחפש:

| בעיה | חפשו ב־ |
| ---- | ------- |
| 404 "Route not found" | `routes/` ו־`app.js` (ה־router מחובר? המתודה נכונה?) |
| 400 עם שגיאות שדות | `schemas/` (או המודל, בשגיאות של Mongoose) |
| 401 / 403 | ה־middleware של ה־router, או בדיקת הבעלות ב־controller |
| מוחזרים נתונים שגויים, כלל שגוי | `controllers/` |
| שדה חסר במסד הנתונים | `models/` |

**קובץ router נקרא כמו תוכן עניינים** של המשאב: כל כתובת, מי רשאי לקרוא לה, ומה
נבדק. הלוגיקה נמצאת במקום אחר.

## REST: איך מתכננים את הכתובות

**REST** הוא אוסף מוסכמות ל־API מבוסס HTTP. הרעיון: הכתובות מציינות **דברים**
(משאבים), ו**מתודת ה־HTTP** אומרת מה לעשות איתם.

| מתודה | משמעות | דוגמה | סטטוס הצלחה |
| ----- | ------ | ----- | ----------- |
| `GET` | קריאה | `GET /api/notes` · `GET /api/notes/123` | `200 OK` |
| `POST` | יצירה | `POST /api/notes` | `201 Created` |
| `PATCH` | שינוי של חלק מהשדות | `PATCH /api/notes/123` | `200 OK` |
| `PUT` | החלפה מלאה | (לא בשימוש כאן) | `200 OK` |
| `DELETE` | מחיקה | `DELETE /api/notes/123` | `204 No Content` |

### מוסכמות לכתובות

- **שמות עצם ברבים**, לא פעלים: `/api/notes` ולא `/api/getNotes` או `/api/createNote`.
- **ה־id בנתיב** כשמדובר בפריט אחד: `/api/notes/123`.
- **סינונים ב־query string**: `/api/notes?status=open`.
- **קשרים כנתיבים מקוננים**: `/api/issues/123/updates` (העדכונים של ליקוי 123).
- **פעולות שהן לא עריכה פשוטה** מקבלות נתיב משנה משלהן, בדרך כלל עם `PATCH` או
  `POST`: `/api/notes/123/archive`, `/api/food-posts/123/claim`,
  `/api/loans/123/return`.
- **"mine"** לפריטים של המשתמש המחובר: `/api/reservations/mine`.

### לקרוא את ה־API שבהנחיות

הנתיבים בהנחיות שלכם כבר עוקבים אחרי המוסכמות האלה:

| נתיב בהנחיות | משמעות | בסגנון של הפרויקט |
| ------------ | ------ | ----------------- |
| `GET /api/incidents?status=open` | רשימה מסוננת | `router.get("/", validate("query", ...), listIncidents)` |
| `POST /api/incidents` | יצירה | `router.post("/", validate("body", ...), createIncident)` |
| `PATCH /api/incidents/:id` | עדכון | `router.patch("/:id", ..., updateIncident)` |
| `POST /api/events/:id/assign` | פעולה על אירוע אחד | `router.post("/:id/assign", requireRole(MANAGER), ...)` |
| `GET /api/assignments/mine` | הפריטים שלי | `router.get("/mine", listMyAssignments)` (לפני `/:id`!) |
| `PATCH /api/loans/:id/return` | פעולה | `router.patch("/:id/return", ..., returnLoan)` |
| `POST /api/auth/login` | התחברות | מסופק על ידי Better Auth: `POST /api/auth/sign-in/email` |

> **סדר הנתיבים בתוך router:** נתיבים קבועים (`/mine`, `/stats`) חייבים להופיע
> **לפני** `/:id`. אחרת Express יתייחס ל־`mine` כאל id.

### קודי סטטוס

| קוד | שם | מתי משתמשים |
| --- | -- | ----------- |
| 200 | OK | קריאה או עדכון הצליחו |
| 201 | Created | נוצר משהו (שולחים בחזרה את הפריט החדש) |
| 204 | No Content | נמחק (בלי גוף) |
| 400 | Bad Request | הנתונים לא תקינים |
| 401 | Unauthorized | לא מחובר |
| 403 | Forbidden | מחובר, אבל אין הרשאה |
| 404 | Not Found | הפריט (או הכתובת) לא קיים |
| 409 | Conflict | הפרה של כלל עסקי או של כלל ייחודיות |
| 500 | Internal Server Error | באג. אף פעם לא שולחים את זה בכוונה |

**4xx אומר שהלקוח עשה משהו לא נכון. 5xx אומר שהשרת עשה.**

### מה מחזירים

- **אחרי יצירה או עדכון:** את הפריט עצמו, כדי שלפרונטאנד תהיה הגרסה הסופית (עם
  `id`, `createdAt`, ערכי ברירת מחדל...).
- **רשימות:** מערך, גם כשהוא ריק (`[]`, סטטוס 200, לא 404).
- **שגיאות:** תמיד `{ message }`, ובנוסף `errors` לבעיות בשדות. `onError` עושה
  את זה בשבילכם.
- **אף פעם:** מידע על סיסמאות, מידע פרטי של משתמשים אחרים, stack traces בסביבת
  production.

## שני השרתים

בזמן פיתוח, שתי תוכניות רצות זו לצד זו:

| | Frontend | Backend |
| --- | --- | --- |
| תיקייה | `frontend/` | `backend/` |
| מופעל עם | `npm run dev` (Vite) | `npm run dev` (Node עם `--watch`) |
| פורט | 5173 | 3000 |
| מגיש | את אפליקציית ה־React (HTML, JS, CSS) | JSON בכתובות `/api/...` |
| בשינוי קוד | מעדכן את הדף מיד (HMR) | מפעיל את השרת מחדש |

הדפדפן מדבר רק עם 5173. Vite עונה בעצמו לבקשות של דפים, ומעביר את `/api/...`
לפורט 3000.

## רשימת בדיקה: הוספת נקודת קצה

- [ ] בחרו מתודה וכתובת לפי מוסכמות ה־REST שלמעלה
- [ ] הוסיפו את הנתיב ב־`routes/<resource>.routes.js`, עם `requireAuth` / `requireRole`
- [ ] הוסיפו סכמת Zod ל־body / params / query בתיקייה `schemas/`
- [ ] כתבו את ה־controller: טעינה, בדיקת כללים, שמירה, תשובה עם הסטטוס הנכון
- [ ] חברו את ה־router ב־`app.js` (רק למשאבים חדשים)
- [ ] הוסיפו בקשה (ובקשה שנכשלת) ל־`backend/docs/<resource>.http`
- [ ] קראו לה מה־frontend: loader לקריאה, event handler לשינויים

← המדריך המלא: [adding-a-resource.md](../../adding-a-resource.md)
