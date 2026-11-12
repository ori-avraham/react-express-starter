# 2. טעינת נתונים

[→ נתיבים וניווט](01-routes-and-navigation.md) · [חזרה לתוכן העניינים](../README.md) · [English](../en/02-loading-data.md)

## הבעיה ש־loaders פותרים

הדרך הקלאסית לטעון נתונים ב־React היא `useEffect` + `useState`:

```jsx
// ❌ Not used in this project
function NotesPage() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/notes')
      .then((r) => r.json())
      .then(setNotes)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <Error />
  // ...
}
```

כל דף חוזר על אותם שלושה מצבים, והדף מופיע קודם ריק ורק אחר כך מתמלא.

עם **loader**, הנתב טוען את הנתונים **לפני** שהוא מציג את הדף, ומטפל בטעינה
ובשגיאות בשבילכם:

```jsx
// ✅ This project
export const Route = createFileRoute('/dashboard/notes/')({
  loader: async () => {
    const response = await fetch('/api/notes')
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: NotesPage,
})

function NotesPage() {
  const notes = Route.useLoaderData()   // already loaded, never undefined
  // ...
}
```

## ה־loader שלב אחר שלב

```jsx
loader: async () => {
  const response = await fetch('/api/notes')       // 1. call the API
  const data = await response.json()               // 2. read the JSON body
  if (!response.ok) throw new Error(data.message)  // 3. 4xx/5xx → error screen
  return data                                       // 4. becomes useLoaderData()
},
```

1. `fetch('/api/...')` עובר דרך ה־proxy של Vite אל השרת. עוגיית ה־session
   נשלחת אוטומטית.
2. גם לתשובת הצלחה וגם לתשובת שגיאה יש גוף JSON. בשגיאה הוא נראה כך:
   `{ message, errors? }`.
3. `fetch` **לא** זורק שגיאה על 404 או 500, אלא רק כשהרשת נכשלת. חייבים לבדוק
   את `response.ok` בעצמכם. זריקת שגיאה גורמת לנתב להציג את קומפוננטת השגיאה
   עם `data.message`.
4. מה שמחזירים הוא מה ש־`Route.useLoaderData()` נותן לקומפוננטה.

ה־loader מקבל כמה ערכים שימושיים:

```jsx
loader: async ({ params, deps, context }) => { ... }
```

| ערך | מכיל |
| --- | ---- |
| `params` | פרמטרים מהכתובת (`params.issueId`) |
| `deps` | ערכים מ־`loaderDeps`, בדרך כלל פרמטרי חיפוש (הסבר בהמשך) |
| `context` | ההקשר של הנתיב (`context.session`) |

## מסכי טעינה ושגיאה

לא כותבים אותם לכל דף. `main.jsx` מגדיר ברירות מחדל לכל הנתיבים:

```jsx
const router = createRouter({
  routeTree,
  defaultPendingComponent: PagePending,   // while a loader runs
  defaultErrorComponent: PageError,       // when a loader (or beforeLoad) throws
  defaultPendingMs: 200,
})
```

- **`PagePending`** (`components/page-states.jsx`) מציג בלוקים אפורים (skeleton).
- **`PageError`** מציג את הודעת השגיאה וכפתור *Try again* שמריץ שוב את ה־loader.
- **`defaultPendingMs: 200`**: מסך הטעינה מופיע רק אם הטעינה לוקחת יותר מ־200
  מילישניות, כך שטעינות מהירות לא מהבהבות. אחרי שהוא מופיע, הוא נשאר לפחות
  500 מילישניות כדי שלא יהבהב.

כדי להשתמש במסך אחר בדף מסוים, מגדירים אותו על הנתיב:

```jsx
export const Route = createFileRoute('/dashboard/notes/')({
  loader: ...,
  pendingComponent: NotesSkeleton,
  errorComponent: ({ error }) => <p>Could not load notes: {error.message}</p>,
  component: NotesPage,
})
```

**ריק זו לא שגיאה.** רשימה ריקה היא תשובה מוצלחת. הציגו `<EmptyState>`
בקומפוננטה:

```jsx
{notes.length === 0 ? <EmptyState title="No notes found" /> : <NotesGrid notes={notes} />}
```

## loaders שתלויים בפרמטרי חיפוש: `loaderDeps`

כשסינון הפתקים משתנה (`?status=open` ← `?status=done`), צריך לטעון את הנתונים
מחדש. `loaderDeps` אומר לנתב באילו ערכי חיפוש ה־loader משתמש:

```jsx
export const Route = createFileRoute('/dashboard/notes/')({
  validateSearch: z.object({
    status: z.enum(['open', 'done', 'archived']).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: async ({ deps }) => {
    const url = deps.status ? `/api/notes?status=${deps.status}` : '/api/notes'
    const response = await fetch(url)
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: NotesPage,
})
```

בכל פעם שערך ב־`loaderDeps` משתנה, ה־loader רץ שוב. בלי `loaderDeps`, שינוי
של פרמטרי החיפוש **לא** טוען מחדש את הנתונים, כי הנתב טוען מחדש רק כשמשתנה
משהו שהוא יודע שה־loader תלוי בו.

הוסיפו פרמטר לכתובת רק כשיש לו ערך, כמו ה־`url` שלמעלה. `?status=undefined`
לא יתאים לכלום.

## כמה בקשות לדף אחד

טופס צריך לפעמים נתונים מיותר מנקודת קצה אחת (טופס ההזמנה צריך את רשימת
הציוד). מריצים את הבקשות במקביל עם `Promise.all` ומחזירים אובייקט:

```jsx
loader: async () => {
  const [equipmentResponse, reservationsResponse] = await Promise.all([
    fetch('/api/equipment'),
    fetch('/api/reservations/mine'),
  ])
  if (!equipmentResponse.ok || !reservationsResponse.ok) {
    throw new Error('Could not load the page data.')
  }
  return {
    equipment: await equipmentResponse.json(),
    reservations: await reservationsResponse.json(),
  }
},

// in the component
const { equipment, reservations } = Route.useLoaderData()
```

## אחרי שינוי: `router.invalidate()`

loaders רצים כש**מגיעים** לדף. אחרי שיוצרים, עורכים או מוחקים משהו, הדף עדיין
מציג את הנתונים הישנים עד שאומרים לנתב לטעון מחדש:

```jsx
import { useRouter } from '@tanstack/react-router'

const router = useRouter()

async function saveNote(data) {
  const response = await fetch(`/api/notes/${note.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) return response.json()   // the form shows the error

  toast.success('Note saved')
  await router.invalidate()                  // re-run the loaders → fresh data
}
```

`router.invalidate()` מריץ מחדש את ה־loaders של הדף שפתוח עכשיו (ושל
ה־layouts שלו). הדף נשאר מוצג בזמן הטעינה, ואז מתעדכן.

בוחרים לפי המקום שבו המשתמש צריך להיות בסוף:

| אחרי... | עושים |
| ------- | ----- |
| שמירה באותו דף (עריכה, ארכוב, שינוי תפקיד) | `await router.invalidate()` |
| יצירה בדיאלוג מתוך דף רשימה | סוגרים את הדיאלוג, ואז `await router.invalidate()` |
| מחיקה של הפריט שהדף מציג | `await navigate({ to: '/list' })` (ה־loader של דף הרשימה טוען נתונים עדכניים) |

## כתיבת נתונים (POST, PATCH, DELETE)

loaders נועדו ל**קריאה**. שינויים קורים ב־event handlers (לחיצה על כפתור,
שליחת טופס):

```jsx
// POST: create
await fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

// PATCH: update
await fetch(`/api/notes/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(changes),
})

// PATCH without a body (an action)
await fetch(`/api/notes/${id}/archive`, { method: 'PATCH' })

// DELETE
await fetch(`/api/notes/${id}`, { method: 'DELETE' })
```

- כששולחים גוף, תמיד שולחים `'Content-Type': 'application/json'`
  ו־`JSON.stringify(...)`. אחרת Express לא יכול לקרוא אותו ו־`req.body` ריק.
- תמיד בודקים את `response.ok`, ואז מציגים את התוצאה:

```jsx
if (!response.ok) {
  const { message } = await response.json()
  toast.error(message)        // e.g. "Archived notes cannot be edited."
  return
}
toast.success('Note archived')
await router.invalidate()
```

- לתשובת `204 No Content` (אחרי `DELETE`) **אין גוף**. אל תקראו
  ל־`response.json()` כשהיא מצליחה.

בטפסים, מחזירים את גוף השגיאה במקום להציג toast, והטופס מציג אותו (ראו
`components/notes/note-form.jsx`).

## איפה הנתונים צריכים לגור?

| נתונים | איפה |
| ------ | ---- |
| נתונים מהשרת (פתקים, משתמשים...) | ה־loader ← `Route.useLoaderData()` |
| המשתמש המחובר | `authClient.useSession()` |
| סינונים, לשוניות, טקסט חיפוש | פרמטרי חיפוש (`validateSearch`) |
| מצב ממשק (דיאלוג פתוח, שדה שמקלידים בו) | `useState` בקומפוננטה |
| ערכי טופס | TanStack Form (`useForm`) |

הימנעו מהעתקת נתוני loader לתוך `useState`. אז יש שני עותקים, ואחרי
`router.invalidate()` העותק שב־state כבר לא מעודכן.

## שאלות נפוצות

### הדף מציג נתונים ישנים אחרי שמירה

קראו ל־`await router.invalidate()` אחרי שינוי מוצלח, או נווטו לדף שטוען את
הנתונים מחדש.

### מסך השגיאה כותב "Unexpected token '<'..."

התשובה לא הייתה JSON. בדרך כלל הכתובת שגויה (`fetch('/notes')` במקום
`fetch('/api/notes')`), ולכן Vite ענה עם דף ה־HTML. בדקו את הכתובת בלשונית
**Network** בדפדפן.

### ה־loader מקבל 401

אתם לא מחוברים, או שהבקשה לא עברה דרך ה־proxy. השתמשו בכתובות יחסיות
(`/api/...`), ולעולם לא ב־`http://localhost:3000/...`. ראו את
[השאלות הנפוצות על הזדהות](../../auth/he/04-recipes-and-faq.md#התחברתי-אבל-כל-בקשה-מחזירה-401).

### הסינון משנה את הכתובת אבל לא את הרשימה

ה־loader לא יודע על פרמטר החיפוש. הוסיפו אותו ל־`loaderDeps` וקראו אותו
מ־`deps`.

### `useLoaderData` מחזיר `undefined`

ה־loader לא החזיר כלום. בדקו שהשורה האחרונה היא `return data`.

### מסך הטעינה אף פעם לא מופיע

טעינות שלוקחות פחות מ־200 מילישניות לא מציגות אותו, וזה בכוונה. כדי לראות אותו
בזמן בדיקה, פתחו את DevTools בדפדפן ← Network ← הגדירו throttling ל־*Slow 4G*.

### אפשר להשתמש ב־`useEffect` כדי לטעון נתונים?

זה עובד, אבל אז אתם מטפלים בטעינה, בשגיאות ובריענון בעצמכם. השתמשו ב־loader
לנתוני הדף. `useEffect` מתאים לדברים שהם לא נתוני דף.
