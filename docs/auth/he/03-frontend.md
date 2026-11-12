# 3. הזדהות בצד הלקוח

[→ צד השרת](02-backend.md) · [הבא: מתכונים ושאלות נפוצות ←](04-recipes-and-faq.md) · [English](../en/03-frontend.md)

הקבצים שהדף הזה מסביר:

```
frontend/
  vite.config.js                       The /api proxy
  src/lib/auth-client.js               The Better Auth client
  src/lib/roles.js                     Same roles as the backend
  src/components/login-form.jsx        Sign in
  src/components/signup-form.jsx       Sign up
  src/routes/dashboard/route.jsx       Only signed-in users may enter /dashboard
  src/lib/guards.js                    requireRole() for pages
  src/components/app-sidebar.jsx       Links filtered by role
  src/routes/dashboard/users.jsx       Manager-only page using the admin plugin
```

## `lib/auth-client.js`: הלקוח

```js
export const authClient = createAuthClient({
  baseURL: window.location.origin,   // e.g. http://localhost:5173
  basePath: '/api/auth',
  plugins: [adminClient()],
})
```

`authClient` הוא הדרך של React לדבר עם Better Auth. הוא שולח בקשות
ל־`/api/auth/...`, ו־Vite מעביר אותן לשרת. התוסף `adminClient()` מוסיף את
הפונקציות `authClient.admin.*` (הצגת משתמשים, שינוי תפקיד), בהתאמה לתוסף
ה־admin שבשרת.

הפונקציות שתשתמשו בהן:

| קוד                                          | מה זה עושה                                           |
| -------------------------------------------- | ---------------------------------------------------- |
| `authClient.signUp.email({ name, email, password })` | יצירת חשבון (והתחברות)                       |
| `authClient.signIn.email({ email, password })`       | התחברות                                      |
| `authClient.signOut()`                       | התנתקות                                              |
| `authClient.useSession()`                    | **Hook**: המשתמש הנוכחי בתוך קומפוננטה              |
| `authClient.getSession()`                    | **פונקציה**: המשתמש הנוכחי מחוץ לקומפוננטות (`beforeLoad`, loaders) |
| `authClient.admin.listUsers(...)`            | כל המשתמשים (תפקידי admin בלבד)                      |
| `authClient.admin.setRole({ userId, role })` | שינוי תפקיד (תפקידי admin בלבד)                      |

### התוצאות חוזרות בצורה `{ data, error }`

פונקציות `authClient` **לא זורקות שגיאה** כשהשרת מסרב. הן מחזירות אובייקט עם
`data` או `error`:

```js
const result = await authClient.signIn.email({ email, password })

if (result.error) {
  // e.g. result.error.message === "Invalid email or password"
  setServerError(result.error.message)
  return
}

// result.data.user is the signed-in user
```

תמיד בדקו את `error` לפני שממשיכים.

## התחברות והרשמה

`components/login-form.jsx`:

```js
onSubmit: async ({ value }) => {
  setServerError('')
  const result = await authClient.signIn.email(value)  // { email, password }
  if (result.error) {
    setServerError(result.error.message || 'Unable to sign in.')
    return
  }
  await navigate({ to: '/dashboard' })
},
```

`components/signup-form.jsx` עובד אותו דבר עם
`authClient.signUp.email({ name, email, password })`. הרשמה גם מחברת את
המשתמש, עם תפקיד ברירת המחדל (`member`).

מה קורה מאחורי הקלעים: השרת בודק את הסיסמה, יוצר session ומחזיר עוגייה,
והדפדפן שומר אותה. מעכשיו כל בקשה נושאת אותה, ואין צורך לעשות שום דבר נוסף.

> הטפסים בודקים את הנתונים גם בדפדפן עם Zod (אימייל תקין, סיסמה של 8 תווים
> לפחות). זה רק כדי לתת משוב מהיר, כי Better Auth בודקת שוב בשרת.

## קריאת המשתמש הנוכחי: `useSession()`

בתוך כל קומפוננטה:

```jsx
import { authClient } from '@/lib/auth-client'
import { ROLES } from '@/lib/roles'

function NotesPage() {
  const { data: session, isPending } = authClient.useSession()
  const isManager = session?.user.role === ROLES.MANAGER

  return (
    <>
      <p>Hello {session?.user.name}</p>
      {isManager && <Button>Archive</Button>}
    </>
  )
}
```

| ערך                  | משמעות                                                     |
| -------------------- | ---------------------------------------------------------- |
| `session`            | `null` כשלא מחוברים, אחרת `{ user, session }`              |
| `session.user`       | `{ id, name, email, role, ... }`                           |
| `isPending`          | `true` כל עוד הבדיקה הראשונה עדיין נטענת                   |

למה `session?.user` עם `?.`: ברינדור הראשון ייתכן שהנתונים עוד לא הגיעו,
ואז `session` הוא `null`. ה־`?.` מונע קריסה.

`useSession()` הוא **ריאקטיבי**: אחרי `signIn` או `signOut`, כל קומפוננטה
שמשתמשת בו מתרנדרת מחדש עם הערך החדש.

## הגנה על דפים

### רק משתמשים מחוברים: `dashboard/route.jsx`

`route.jsx` הוא ה**layout** של כל הדפים תחת `/dashboard`. ה־`beforeLoad` שלו
רץ לפני שכל אחד מהדפים האלה נטען:

```js
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) throw redirect({ to: '/signin' })
    return { session }
  },
  component: DashboardLayout,
})
```

- `beforeLoad` הוא לא קומפוננטה, ולכן אי אפשר להשתמש בו ב־hooks. בגלל זה הוא
  קורא ל־`getSession()` (פונקציה אסינכרונית רגילה) ולא ל־`useSession()`.
- אין session ← `throw redirect(...)` שולח את המשתמש לדף ההתחברות לפני שמשהו
  מוצג.
- `return { session }` מכניס את ה־session ל**הקשר (context) של הנתיב**. כל
  נתיב בן תחת `/dashboard` מקבל אותו.

### רק תפקידים מסוימים: `requireRole()` ב־`lib/guards.js`

```js
export function requireRole(...roles) {
  return ({ context }) => {
    if (!roles.includes(context.session.user.role)) {
      toast.error('You do not have permission to open that page.')
      throw redirect({ to: '/dashboard' })
    }
  }
}
```

הפונקציה קוראת את `context.session`, הערך שה־layout של הדשבורד החזיר למעלה.
אפשר להשתמש בה בכל דף תחת `/dashboard`:

```js
// routes/dashboard/users.jsx
export const Route = createFileRoute('/dashboard/users')({
  beforeLoad: requireRole(ROLES.MANAGER),
  loader: ...,
  component: UsersPage,
})
```

הסדר הוא: `beforeLoad` של ה־layout (מחובר?) ← `beforeLoad` של הדף (תפקיד
מתאים?) ← `loader` של הדף (טעינת נתונים) ← קומפוננטת הדף.

## הסתרת קישורים וכפתורים

סרגל הצד (`components/app-sidebar.jsx`) מציג קישור רק לתפקידים שהוגדרו לו:

```js
const navItems = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Notes', to: '/dashboard/notes', icon: NotebookPenIcon },
  { title: 'Users', to: '/dashboard/users', icon: UsersIcon, roles: [ROLES.MANAGER] },
]

const visibleItems = navItems.filter(
  (item) => !item.roles || item.roles.includes(user.role),
)
```

כפתורים משתמשים באותה בדיקה עם `useSession()`. דף הפתקים מחשב את `isManager`
ומעביר אותו לכל כרטיס, והכרטיס מציג את כפתור *Archive* רק למנהלים
(`components/notes/note-card.jsx`).

> זכרו: הסתרה היא **לא** הגנה. משתמש רגיל שמקליד `/dashboard/users` נעצר
> ב־`requireRole()`, ומשתמש רגיל שקורא ישירות ל־`PATCH /api/notes/:id/archive`
> נעצר בשרת. שלוש השכבות קיימות בכוונה.

## קריאה ל־API שלכם

בזכות ה־proxy של Vite, `fetch('/api/...')` הולך לאותו אתר כמו הדף, והדפדפן
שולח את עוגיית ה־session אוטומטית. בלי טוקן ובלי header של `Authorization`:

```js
const response = await fetch('/api/notes')
```

אם המשתמש לא מחובר (או שה־session פג), השרת עונה `401` ו־`response.ok` יהיה
`false`. בדפים תחת `/dashboard` זה כמעט לא קורה, כי ה־layout כבר בדק את
ה־session.

## התנתקות

ב־`dashboard/route.jsx`:

```js
async function handleSignOut() {
  await authClient.signOut()          // deletes the session, clears the cookie
  await navigate({ to: '/signin' })
}
```

## דף המשתמשים: תוסף ה־admin בפעולה

מאחורי `routes/dashboard/users.jsx` **אין נתיב Express**. הדף קורא ישירות
לנקודות הקצה של תוסף ה־admin:

```js
// loader: all users
const { data, error } = await authClient.admin.listUsers({
  query: { limit: 100, sortBy: 'name' },
})

// change a user's role
const { error } = await authClient.admin.setRole({ userId, role })
```

השרת מאשר את הקריאות האלה רק לתפקידים שב־`ADMIN_ROLES`
(`backend/src/lib/roles.js`). משתמש רגיל שקורא להן מקבל שגיאה, גם דרך REST
Client.

הדף גם משבית את תפריט התפקיד בשורה של המנהל עצמו, כדי שמנהל לא יסיר בטעות את
ההרשאות של עצמו.

## סיכום

| רוצים...                             | משתמשים ב...                                            |
| ------------------------------------ | ------------------------------------------------------- |
| המשתמש בתוך קומפוננטה                | `authClient.useSession()` ← `session?.user`             |
| המשתמש ב־`beforeLoad` / loader       | `context.session` (תחת `/dashboard`) או `authClient.getSession()` |
| התחברות / הרשמה / התנתקות            | `authClient.signIn.email` / `signUp.email` / `signOut`  |
| דף רק למשתמשים מחוברים               | שמים אותו תחת `routes/dashboard/`                       |
| דף רק לתפקידים מסוימים               | `beforeLoad: requireRole(ROLES.X)`                      |
| הסתרת קישור                          | `roles: [...]` ב־`navItems`                             |
| הסתרת כפתור                          | `session?.user.role === ROLES.X && <Button />`          |
| קריאה ל־API בתור המשתמש המחובר       | `fetch('/api/...')`, והעוגייה נשלחת אוטומטית            |
