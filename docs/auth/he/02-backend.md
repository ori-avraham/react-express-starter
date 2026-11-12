# 2. הזדהות בצד השרת

[→ מושגים](01-how-auth-works.md) · [הבא: צד הלקוח ←](03-frontend.md) · [English](../en/02-backend.md)

הקבצים שהדף הזה מסביר:

```
backend/
  .env                        BETTER_AUTH_SECRET, BETTER_AUTH_URL, CLIENT_URL
  src/lib/roles.js            The roles and what they may do in Better Auth
  src/lib/auth.js             The Better Auth configuration
  src/app.js                  Connects Better Auth to Express
  src/middleware/auth.js      requireAuth and requireRole
  src/controllers/notes.controller.js   Ownership checks (example)
  src/seed.js                 Creates demo users
```

## משתני סביבה (`backend/.env`)

| משתנה                | תפקיד                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET` | סוד שמשמש לחתימה על העוגיות. חייב להיות ארוך ואקראי (32 תווים ומעלה). אם משנים אותו, כל המשתמשים מתנתקים. **לעולם אל תעלו את הסוד האמיתי ל־Git.** |
| `BETTER_AUTH_URL`    | הכתובת של השרת עצמו (`http://localhost:3000`).                            |
| `CLIENT_URL`         | הכתובת של ה־frontend. Better Auth מקבלת בקשות התחברות רק מהכתובת הזו (`trustedOrigins`), וגם CORS מאשר אותה. |

כדי לייצר סוד: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.

## `lib/roles.js`: התפקידים

```js
export const ROLES = {
  MEMBER: "member",
  MANAGER: "manager",
};

export const DEFAULT_ROLE = ROLES.MEMBER;
```

- `ROLES` היא הרשימה שמשתמשים בה בכל הקוד: כותבים `ROLES.MANAGER` במקום
  `"manager"`. טעות הקלדה בקבוע היא שגיאה שרואים מיד, וטעות הקלדה במחרוזת היא
  באג שקט.
- `DEFAULT_ROLE` הוא התפקיד שמקבל כל מי שנרשם דרך האתר. אף אחד לא יכול לבחור
  לעצמו תפקיד בהרשמה.

החלק השני של הקובץ מיועד ל**תוסף ה־admin** של Better Auth (הסבר בהמשך):

```js
const ac = createAccessControl(defaultStatements);

export const authRoles = {
  [ROLES.MANAGER]: ac.newRole(adminAc.statements), // all admin powers
  [ROLES.MEMBER]: ac.newRole(userAc.statements),   // no admin powers
};

export const ADMIN_ROLES = [ROLES.MANAGER];
```

לתוסף ה־admin יש פעולות מובנות כמו *הצגת משתמשים*, *שינוי תפקיד* ו*חסימת
משתמש*. `authRoles` קובע איזה תפקיד רשאי לבצע כל אחת מהן. לא צריך להבין את
`createAccessControl` לעומק: המנהל מקבל הכול, ושאר התפקידים לא מקבלים כלום.
אם מוסיפים תפקיד, מוסיפים אותו גם כאן.

## `lib/auth.js`: ההגדרות

```js
export const auth = betterAuth({
  database: mongodbAdapter(database),   // store users and sessions in MongoDB
  trustedOrigins: [clientUrl],          // accept requests from the frontend
  emailAndPassword: {
    enabled: true,                      // sign up / sign in with email + password
  },
  plugins: [
    adminPlugin({
      roles: authRoles,                 // from roles.js
      defaultRole: DEFAULT_ROLE,        // role for new sign-ups
      adminRoles: ADMIN_ROLES,          // roles that may use admin endpoints
    }),
  ],
});
```

- **`database`**: Better Auth יוצרת ומנהלת את האוספים `user`, `account`,
  `session` ו־`verification`.
- **`emailAndPassword`**: מפעיל את נקודות הקצה של הרשמה והתחברות. אורך סיסמה
  מינימלי כברירת מחדל הוא 8 תווים.
- **`adminPlugin`**: מוסיף לכל משתמש את השדה `role`, ומוסיף את נקודות הקצה
  לניהול משתמשים שמשמשות את דף *Users*.

האובייקט `auth` שמיוצא מהקובץ משמש בשלושה מקומות: `app.js` (טיפול בבקשות),
`middleware/auth.js` (קריאת ה־session) ו־`seed.js` (יצירת משתמשים).

## `app.js`: חיבור Better Auth ל־Express

```js
// Better Auth must receive the raw request body before express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
```

כל בקשה שהכתובת שלה מתחילה ב־`/api/auth/` עוברת ל־Better Auth. השורה הזו חייבת
להופיע **לפני** `express.json()`, כי Better Auth קוראת את גוף הבקשה בעצמה.

את הנתיבים האלה אתם לא כותבים. Better Auth מספקת אותם:

| Method | URL                              | מה זה עושה                              |
| ------ | -------------------------------- | --------------------------------------- |
| POST   | `/api/auth/sign-up/email`        | יצירת חשבון והתחברות                   |
| POST   | `/api/auth/sign-in/email`        | התחברות (יוצרת session ועוגייה)        |
| POST   | `/api/auth/sign-out`             | התנתקות (מוחקת את ה־session)           |
| GET    | `/api/auth/get-session`          | המשתמש וה־session הנוכחיים, או `null`  |
| GET    | `/api/auth/admin/list-users`     | כל המשתמשים (תפקידי admin בלבד)        |
| POST   | `/api/auth/admin/set-role`       | שינוי תפקיד של משתמש (תפקידי admin בלבד) |
| POST   | `/api/auth/admin/create-user`    | יצירת משתמש עם תפקיד (תפקידי admin בלבד) |

אפשר לנסות אותם עם `backend/docs/auth.http`.

## `middleware/auth.js`: הגנה על הנתיבים שלכם

Better Auth מגינה על נקודות הקצה שלה. את נקודות הקצה **שלכם** (`/api/notes`,
`/api/incidents`...) מגינים בעזרת שתי פונקציות middleware.

### `requireAuth`: "חייבים להיות מחוברים"

```js
export async function requireAuth(req, _res, next) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    throw httpError(401, "You must be signed in.");
  }

  req.user = session.user;
  next();
}
```

שלב אחר שלב:

1. `fromNodeHeaders(req.headers)` מעביר ל־Better Auth את ה־headers של הבקשה,
   כולל העוגייה.
2. `auth.api.getSession()` קוראת את הטוקן מהעוגייה, מחפשת את ה־session
   ב־MongoDB, ומחזירה `{ session, user }`. אם אין session תקף (אין עוגייה, פג
   תוקף, המשתמש התנתק) היא מחזירה `null`.
3. אין session ← עוצרים עם **401**.
4. אחרת המשתמש נשמר ב־`req.user`, כדי שהפונקציות הבאות יוכלו להשתמש בו:

```js
req.user = {
  id: "6aef8ef455dab10df0c77b89",
  name: "Dan Member",
  email: "member@demo.com",
  role: "member",
  // ...
}
```

### `requireRole(...roles)`: "חייבים אחד מהתפקידים האלה"

```js
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw httpError(401, "You must be signed in.");
    if (!roles.includes(req.user.role)) {
      throw httpError(403, `Only ${roles.join(" or ")} users can do this.`);
    }
    next();
  };
}
```

`requireRole` היא פונקציה ש**מחזירה** middleware. לכן קוראים לה עם סוגריים:
`requireRole(ROLES.MANAGER)`. אפשר להעביר יותר מתפקיד אחד:
`requireRole(ROLES.MANAGER, ROLES.MAINTENANCE)`.

היא קוראת את `req.user`, ולכן חייבת להופיע תמיד **אחרי** `requireAuth`.

### שימוש בתוך router

מתוך `routes/notes.routes.js`:

```js
// Every route in this file requires a signed-in user.
notesRouter.use(requireAuth);

notesRouter.get("/", validate("query", listNotesQuery), listNotes);

// Only managers can archive.
notesRouter.patch(
  "/:id/archive",
  requireRole(ROLES.MANAGER),
  validate("params", noteIdParams),
  archiveNote,
);
```

בקשה עוברת דרך הפונקציות לפי הסדר. אם אחת מהן זורקת שגיאה, השאר לא רצות
ו־`onError` שולח את תשובת השגיאה:

```
PATCH /api/notes/123/archive
   │
   ├─ requireAuth          no cookie?        → 401
   ├─ requireRole(MANAGER) member?           → 403
   ├─ validate(params)     bad id?           → 400
   └─ archiveNote          not found? → 404 · already archived? → 409 · OK → 200
```

## בעלות: "רק שלך"

תפקידים עונים על השאלה *"איזה סוג משתמש אתה?"*. הרבה כללים עוסקים ב**אילו
רשומות** המשתמש רשאי לגעת: *"סטודנט רשאי לבטל רק הזמנה שלו"*. את זה אי אפשר
לבדוק ב־router, כי הוא עדיין לא יודע למי שייכת הרשומה. בודקים את זה
ב־controller, אחרי שטוענים אותה.

מתוך `controllers/notes.controller.js`:

```js
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
```

וברשימות מסננים לפי בעלים, כדי שמשתמש רגיל יקבל רק את הנתונים שלו:

```js
if (!isManager(req.user)) {
  filter.owner = req.user.id;
}
```

### השוואת מזהים (ids)

`req.user.id` הוא **מחרוזת**. `note.owner` הוא **ObjectId** של MongoDB (או
מסמך משתמש שלם אחרי `.populate()`). השוואה עם `===` תחזיר תמיד `false`. קודם
ממירים למחרוזת:

```js
note.owner.toString() === req.user.id          // owner not populated
note.owner._id.toString() === req.user.id      // owner populated
```

### לעולם לא סומכים על הלקוח בשאלה "מי"

כשיוצרים רשומה, לוקחים את הבעלים מה־session ולא מגוף הבקשה:

```js
await Note.create({ ...req.valid.body, owner: req.user.id });   // ✅
await Note.create(req.body);  // ❌ the client could send someone else's id as owner
```

סכמת ה־Zod בכלל לא מכילה את `owner`, כך שאי אפשר לשלוח אותו.

## יצירת משתמשים מהקוד (`seed.js`)

חייבים ליצור משתמשים דרך Better Auth, כדי שהסיסמה תעבור hash וייווצר מסמך
`account`:

```js
const { user } = await auth.api.createUser({
  body: {
    name: "Maya Manager",
    email: "manager@demo.com",
    password: "password1234",
    role: ROLES.MANAGER,
  },
});
```

לעולם אל תכניסו משתמשים עם `db.collection("user").insertOne(...)`: לא תהיה
להם סיסמה והם לא יוכלו להתחבר אף פעם.

## סיכום

| רוצים...                                       | משתמשים ב...                                     |
| ---------------------------------------------- | ------------------------------------------------ |
| לחייב משתמש מחובר                              | `requireAuth` (ב־router)                         |
| לאפשר רק לתפקידים מסוימים                      | `requireRole(ROLES.X)` אחרי `requireAuth`        |
| לאפשר רק לבעלים (או למנהל)                     | טוענים את הרשומה, משווים ids, `throw httpError(403, ...)` |
| לדעת מי קורא ל־API                             | `req.user.id`, `req.user.role`                   |
| לקבוע את הבעלים של רשומה חדשה                  | `owner: req.user.id` ב־controller                |
| ליצור משתמשים מהקוד                            | `auth.api.createUser(...)`                       |
