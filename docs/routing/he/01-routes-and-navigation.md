# 1. נתיבים וניווט

[הבא: טעינת נתונים ←](02-loading-data.md) · [English](../en/01-routes-and-navigation.md)

ה־frontend משתמש ב־**TanStack Router**. ההנחיות מזכירות React Router. הרעיונות
זהים (דפים, קישורים, פרמטרים בכתובת), אבל TanStack Router יוצר נתיבים **מתוך
קבצים** ויכול לטעון נתונים לפני שהדף מוצג.

## קבצים הופכים לכתובות

כל קובץ בתיקייה `frontend/src/routes/` הוא דף. המיקום שלו בתיקייה הוא הכתובת
שלו:

```
src/routes/
├── __root.jsx                    (wraps every page)
├── index.jsx                     /
├── signin.jsx                    /signin
├── signup.jsx                    /signup
└── dashboard/
    ├── route.jsx                 (layout for everything under /dashboard)
    ├── index.jsx                 /dashboard
    ├── users.jsx                 /dashboard/users
    └── notes/
        └── index.jsx             /dashboard/notes   (new and edit happen in dialogs)
```

דף של **פריט אחד** משתמש בפרמטר בשם הקובץ. בדוגמת הפתקים העריכה נעשית בדיאלוג,
ולכן אין בו צורך, אבל דף *פרטי ליקוי והיסטוריית עדכונים* של FixTrack היה נראה
כך:

```
src/routes/dashboard/issues/
├── index.jsx                     /dashboard/issues
└── $issueId.jsx                  /dashboard/issues/:issueId   e.g. /dashboard/issues/6aef8e2f...
```

| שם קובץ | משמעות |
| ------- | ------ |
| `index.jsx` | הדף שבכתובת של התיקייה עצמה (`dashboard/index.jsx` ← `/dashboard`) |
| `something.jsx` | דף בכתובת `/.../something` |
| `route.jsx` | **layout** של התיקייה: עוטף כל דף שבתוכה |
| `$name.jsx` | **פרמטר**: מתאים לכל ערך, וזמין בשם `name` |
| `__root.jsx` | ה־layout הראשי, מסביב לכל דף באפליקציה |
| `-anything` | קבצים ותיקיות שמתחילים ב־`-` **לא נחשבים לדפים**, כך שאפשר לשמור קובצי עזר ליד הדפים (`notes/-components/`) |

### `routeTree.gen.ts` נוצר אוטומטית

כל עוד `npm run dev` רץ, התוסף של הנתב עוקב אחרי `src/routes/` וכותב מחדש את
`src/routeTree.gen.ts`. **לעולם אל תערכו אותו.** אם משהו נראה לא תקין, הפעילו
מחדש את `npm run dev`.

### יצירת דף חדש

צרו קובץ **ריק**, למשל `src/routes/dashboard/equipment/index.jsx`, בזמן ששרת
הפיתוח רץ. התוסף ימלא אותו:

```jsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/equipment/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/equipment/"!</div>
}
```

כל קובץ נתיב מייצא `Route`. המחרוזת שמועברת ל־`createFileRoute` היא הנתיב של
הדף, והיא חייבת להתאים למיקום הקובץ. התוסף שומר עליה נכונה, ואם מזיזים קובץ
הוא מעדכן אותה.

## Layouts: `route.jsx` ו־`<Outlet />`

layout הוא ממשק משותף שעוטף כמה דפים. `dashboard/route.jsx` מצייר את סרגל הצד
פעם אחת, וכל דף תחת `/dashboard` מופיע בתוכו, במקום `<Outlet />`:

```jsx
// dashboard/route.jsx (simplified)
function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar ... />
      <SidebarInset>
        <Outlet />          {/* ← dashboard/index.jsx, notes/index.jsx, users.jsx... */}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

layouts מקוננים זה בתוך זה. עבור `/dashboard/notes` הנתב מציג:

```
__root.jsx                   Toaster, tooltips
└── dashboard/route.jsx      sidebar + signed-in check
    └── notes/index.jsx      the notes page
```

כך כל דף מכיל רק את התוכן **שלו**. סרגל הצד, בדיקת ההתחברות וה־toaster מגיעים
מה־layouts שמעליו.

## קישורים בין דפים: `<Link>`

```jsx
import { Link } from '@tanstack/react-router'

<Link to="/dashboard/notes">All notes</Link>
```

השתמשו ב־`<Link>` ולא ב־`<a href>`. `<Link>` מחליף דף בלי לטעון מחדש את כל
האפליקציה, ולכן הוא מיידי ושומר על המצב.

`to` חייב להיות נתיב שקיים. כשיש פרמטר, מעבירים אותו בנפרד:

```jsx
<Link to="/dashboard/issues/$issueId" params={{ issueId: issue.id }}>
  {issue.title}
</Link>
```

עם פרמטרי חיפוש (הסבר בהמשך):

```jsx
<Link to="/dashboard/notes" search={{ status: 'open' }}>Open notes</Link>
```

### קישורים שנראים כמו כפתורים

ה־`Button` של shadcn יכול להיות מוצג כקישור בעזרת `render`.
`nativeButton={false}` אומר לו שהאלמנט הוא לא `<button>` אמיתי:

```jsx
<Button nativeButton={false} render={<Link to="/signup" />}>
  Get started
</Button>
```

### עיצוב הקישור הפעיל

`<Link>` מוסיף `data-status="active"` כשהדף שלו פתוח. אפשר גם להעביר
classes:

```jsx
<Link to="/dashboard/notes" activeProps={{ className: 'font-bold' }}>Notes</Link>
```

סרגל הצד מחשב את `isActive` מהכתובת הנוכחית (ראו `components/app-sidebar.jsx`).

## ניווט מתוך הקוד: `navigate()`

אחרי פעולה (שמירה, מחיקה, התחברות) עוברים לדף אחר מתוך הקוד:

```jsx
const navigate = Route.useNavigate()   // or useNavigate() from '@tanstack/react-router'

async function deleteNote() {
  // ... delete ...
  await navigate({ to: '/dashboard/notes' })
}
```

`navigate()` מקבל את אותן אפשרויות כמו `<Link>`: `to`, `params`, `search`.

## פרמטרים בכתובת: `$issueId`

קובץ כמו `issues/$issueId.jsx` מתאים ל־`/dashboard/issues/<כל ערך>`. הערך זמין
ב־loader ובקומפוננטה:

```jsx
export const Route = createFileRoute('/dashboard/issues/$issueId')({
  loader: async ({ params }) => {
    const response = await fetch(`/api/issues/${params.issueId}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: IssuePage,
})

function IssuePage() {
  const issue = Route.useLoaderData()
  const { issueId } = Route.useParams()
  // ...
}
```

פרמטרים הם תמיד **מחרוזות**.

**דף או דיאלוג?** השתמשו בדיאלוג לטפסי יצירה ועריכה מהירים (כמו בפתקים). השתמשו
בדף `$id` כשיש הרבה מה להציג על פריט אחד: הפרטים שלו ועוד היסטוריה, תגובות או
פריטים קשורים, או כשרוצים שאפשר יהיה לשתף קישור אליו.

## פרמטרי חיפוש: `?status=open`

חלק מהמצב שייך לכתובת: סינונים, הלשונית הנוכחית, טקסט חיפוש. ככה רענון שומר
עליו, כפתור "אחורה" עובד, ואפשר לשתף את הקישור.

`notes/index.jsx` שומר את סינון הסטטוס ב־`?status=`:

```jsx
export const Route = createFileRoute('/dashboard/notes/')({
  validateSearch: z.object({
    status: z.enum(['open', 'done', 'archived']).optional().catch(undefined),
  }),
  // ...
})

function NotesPage() {
  const { status } = Route.useSearch()      // 'open' | 'done' | 'archived' | undefined
  const navigate = Route.useNavigate()

  function changeFilter(value) {
    navigate({ search: { status: value === 'all' ? undefined : value } })
  }
  // ...
}
```

- `validateSearch` בודק את הכתובת עם Zod. `.catch(undefined)` אומר שערך לא
  תקין (`?status=banana`) פשוט מתעלמים ממנו, במקום שהדף יקרוס.
- `Route.useSearch()` קורא את הערכים אחרי הבדיקה.
- `navigate({ search: {...} })` משנה אותם. `undefined` מסיר את הפרמטר מהכתובת.

**מתי להשתמש בפרמטרי חיפוש ולא ב־`useState`:** אם רענון הדף צריך לשמור על
הערך, שימו אותו בכתובת. אם הוא זמני (דיאלוג פתוח, שדה שמקלידים בו), השתמשו
ב־`useState`.

## `beforeLoad`: בדיקות לפני הדף

`beforeLoad` רץ **לפני** שנתיב נטען. אם הוא זורק `redirect(...)`, הדף לא מוצג
בכלל. בפרויקט משתמשים בו לבקרת גישה:

```jsx
// dashboard/route.jsx: only signed-in users
beforeLoad: async () => {
  const { data: session } = await authClient.getSession()
  if (!session) throw redirect({ to: '/signin' })
  return { session }
},
```

```jsx
// dashboard/users.jsx: only managers
beforeLoad: requireRole(ROLES.MANAGER),
```

מה ש־`beforeLoad` **מחזיר** נוסף ל**הקשר (context) של הנתיב**, וכל נתיב בן
מקבל אותו. כך `requireRole()` קורא את `context.session` בלי לטעון את ה־session
שוב. בתוך קומפוננטה קוראים אותו עם `Route.useRouteContext()`.

עוד במדריך ה[הזדהות](../../auth/he/03-frontend.md#הגנה-על-דפים).

## הסדר של הכול

עבור `/dashboard/users`:

```
1. __root          beforeLoad
2. dashboard       beforeLoad   → signed in? (else redirect to /signin)
3. users           beforeLoad   → requireRole(MANAGER) (else redirect to /dashboard)
4. all loaders run              → fetch the users       ← next page of this guide
5. components render            → root → dashboard layout → users page
```

הורים תמיד רצים לפני הילדים. redirect בכל שלב עוצר את כל מה שמתחתיו.

## מה יש על `Route`

בתוך קובץ נתיב, האובייקט `Route` נותן hooks שמותאמים לנתיב הזה:

| Hook | מחזיר |
| ---- | ----- |
| `Route.useLoaderData()` | מה שה־loader החזיר |
| `Route.useParams()` | פרמטרים מהכתובת (`{ issueId }`) |
| `Route.useSearch()` | פרמטרי חיפוש אחרי בדיקה (`{ status }`) |
| `Route.useNavigate()` | פונקציית `navigate` |
| `Route.useRouteContext()` | ההקשר (למשל `{ session }`) |

בקומפוננטות **מחוץ** לקובצי נתיבים, ייבאו את הגרסאות הכלליות
מ־`@tanstack/react-router`: `useNavigate()`, `useRouter()`,
`useParams({ strict: false })`.

## סיכום

| רוצים... | עושים |
| -------- | ----- |
| להוסיף דף | יוצרים קובץ ב־`src/routes/` (ריק, והתוסף ממלא אותו) |
| ממשק משותף לכמה דפים | `route.jsx` עם `<Outlet />` |
| כתובת עם id | `$id.jsx`, וקוראים עם `params.id` / `Route.useParams()` |
| קישור לדף | `<Link to="..." params={...} search={...}>` |
| מעבר לדף מתוך הקוד | `navigate({ to: '...' })` |
| לשמור סינון בכתובת | `validateSearch` + `Route.useSearch()` + `navigate({ search })` |
| לחסום דף | `beforeLoad` + `throw redirect(...)` |
