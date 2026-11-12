# 1. איך עובדים טפסים

[הבא: מתכונים ←](02-recipes.md) · [English](../en/01-how-forms-work.md)

הטפסים בפרויקט משתמשים ב־**TanStack Form** לניהול המצב של הטופס, ב־**Zod**
לכללים, וברכיבי שדות מוכנים מתוך `frontend/src/components/form-fields.jsx`.

הדוגמה המלאה נמצאת ב־`frontend/src/components/notes/note-form.jsx`. הדף הזה
מפרק אותה לחלקים.

## למה צריך ספריית טפסים?

טופס צריך יותר מ־`useState` לכל שדה. הוא צריך לדעת מה הערך של כל שדה, אם
המשתמש כבר נגע בו, מה השגיאות שלו, אם הטופס נשלח עכשיו, ומתי להציג מה.
TanStack Form עוקב אחרי כל זה, והקוד שלכם רק מתאר **את השדות, את הכללים ומה
קורה בשליחה**.

## ארבעת החלקים של טופס

```jsx
// 1. The rules
const noteSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.'),
  content: z.string().max(2000, 'Content must be at most 2000 characters.'),
})

function NoteForm({ onSubmit }) {
  // 2. The form: starting values, rules, what to do on submit
  const form = useForm({
    defaultValues: { title: '', content: '' },
    validators: { onChange: noteSchema, onSubmit: noteSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  return (
    // 3. The <form> element
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* 4. The fields */}
      <form.Field name="title">
        {(field) => <TextField field={field} label="Title" />}
      </form.Field>
      <form.Field name="content">
        {(field) => <TextareaField field={field} label="Content" />}
      </form.Field>

      <Button type="submit">Save</Button>
    </form>
  )
}
```

### 1. הכללים: סכמת Zod

```js
const noteSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.'),
})
```

שורה לכל שדה. ההודעה היא מה שהמשתמש רואה. שמרו על **אותם כללים כמו בסכמה של
השרת** (`backend/src/schemas/*.schemas.js`), כדי שהדפדפן והשרת יסכימו.

> Zod בודק את הערך, אבל **לא משנה** את מה שהטופס מחזיק. בגלל `.trim()`, הערך
> `"  ab  "` נכשל ב־`min(3)`, אבל `value.title` ב־`onSubmit` עדיין מכיל את
> הרווחים. הסכמה של השרת מסירה אותם לפני השמירה.

### 2. `useForm`: הטופס עצמו

```js
const form = useForm({
  defaultValues: { title: '', content: '' },
  validators: { onChange: noteSchema, onSubmit: noteSchema },
  onSubmit: async ({ value }) => { ... },
})
```

| אפשרות | משמעות |
| ------ | ------ |
| `defaultValues` | הערך ההתחלתי של **כל** שדה. שדות טקסט מתחילים ב־`''`, אף פעם לא ב־`undefined`. |
| `validators.onChange` | בדיקת הכללים בכל הקשה. |
| `validators.onSubmit` | בדיקה נוספת כשהטופס נשלח. |
| `onSubmit` | רץ רק כש**כל** הכללים עוברים. `value` מכיל את כל השדות. |

### 3. האלמנט `<form>`

```jsx
<form
  onSubmit={(event) => {
    event.preventDefault()   // stop the browser from reloading the page
    form.handleSubmit()      // validate, then call onSubmit if valid
  }}
>
```

כפתור השליחה חייב להיות `type="submit"`. לחיצה על Enter בתוך שדה גם שולחת את
הטופס.

### 4. השדות: `<form.Field>`

```jsx
<form.Field name="title">
  {(field) => <TextField field={field} label="Title" />}
</form.Field>
```

התבנית הזו נקראת **render prop**: במקום ילדים רגילים, `<form.Field>` מקבל
**פונקציה**. TanStack Form קורא לה עם אובייקט `field` של `title`, ואתם מחזירים
את השדה שצריך להציג. אפשר לקרוא את זה כך: *"עבור השדה `title`, צייר `TextField`
שמחובר אליו."*

`name` חייב להתאים למפתח ב־`defaultValues`.

## מה יש בתוך `field`

| מאפיין | משמעות |
| ------ | ------ |
| `field.name` | `"title"` |
| `field.state.value` | הערך הנוכחי |
| `field.handleChange(newValue)` | קביעת הערך (קוראים לו ב־`onChange`) |
| `field.handleBlur()` | סימון השדה כ"נגעו בו" (קוראים לו ב־`onBlur`) |
| `field.state.meta.isTouched` | המשתמש יצא מהשדה לפחות פעם אחת (או שלח את הטופס) |
| `field.state.meta.isValid` | אין שגיאות |
| `field.state.meta.errors` | הודעות השגיאה מ־Zod |

## רכיבי השדות: `components/form-fields.jsx`

חיבור ידני של שדה לוקח בערך 20 שורות. `TextField` עושה את זה בשבילכם:

```jsx
export function TextField({ field, label, type = 'text', ...props }) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}                                   // show the value
        onBlur={field.handleBlur}                                   // mark as touched
        onChange={(event) => field.handleChange(event.target.value)} // update the value
        aria-invalid={isInvalid}
        {...props}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
```

- **`isInvalid`** נכון רק כשיש לשדה שגיאות **וגם** נגעו בו. כך טופס חדש וריק לא
  מקבל את המשתמש בהודעות אדומות. השגיאות מופיעות אחרי שהמשתמש יוצא משדה, או
  לוחץ על שליחה.
- מאפיינים נוספים (`placeholder`, `rows`, `min`, `disabled`...) עוברים ישירות
  לשדה דרך `{...props}`.

הרכיבים הזמינים:

| רכיב | מתאים ל־ |
| ---- | -------- |
| `TextField` | טקסט, אימייל, סיסמה, מספר, תאריך, תאריך ושעה (`type="..."`) |
| `TextareaField` | טקסט ארוך |
| `SelectField` | בחירה של אפשרות אחת מרשימה |
| `ServerError` | השגיאה שהשרת החזיר (הסבר בהמשך) |

## מה קורה מתי?

```
User types in "Title"
  → handleChange → value updated → onChange rules run
  → field not touched yet → no red message

User leaves "Title"
  → handleBlur → field touched → if invalid, the message appears

User presses "Save"
  → handleSubmit → all fields marked touched → onSubmit rules run
      invalid → every error appears, onSubmit is NOT called
      valid   → onSubmit({ value }) runs → isSubmitting is true until it finishes
```

## כפתור השליחה: `form.Subscribe`

כל עוד `onSubmit` מחכה לשרת, הכפתור צריך להיות מושבת, כדי שהמשתמש לא ישלח את
הטופס פעמיים:

```jsx
<form.Subscribe selector={(state) => state.isSubmitting}>
  {(isSubmitting) => (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting && <LoaderCircle className="animate-spin" />}
      Save
    </Button>
  )}
</form.Subscribe>
```

גם `form.Subscribe` הוא render prop: הוא מצייר מחדש רק את הכפתור כש־`isSubmitting`
משתנה, ולא את כל הטופס. `isSubmitting` נכון כל עוד פונקציית ה־`onSubmit` שלכם
לא הסתיימה, ולכן השאירו את ה־`await` על הבקשה בתוכה.

## שגיאות מהשרת

הדפדפן לא יכול לבדוק הכול. *"הכותרת הזו כבר קיימת"* או *"אי אפשר לערוך פתק
בארכיון"* ידועים רק בשרת. הוא עונה כך:

```json
{ "message": "Some fields are invalid.", "errors": { "title": ["Title must be at least 3 characters."] } }
```

`NoteForm` מציג את זה בעזרת הרכיב `ServerError`. החוזה פשוט: **ה־`onSubmit` של
הדף מחזיר את גוף השגיאה אם הבקשה נכשלה, ולא מחזיר כלום אם היא הצליחה.**

```jsx
// In the page (e.g. components/notes/new-note-dialog.jsx)
async function createNote(data) {
  const response = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) return response.json()   // ← { message, errors } goes back to the form

  toast.success('Note created')
  setOpen(false)
  await router.invalidate()
}
```

```jsx
// In the form (components/notes/note-form.jsx)
const [serverError, setServerError] = useState(null)

onSubmit: async ({ value }) => {
  setServerError(null)                    // clear the previous error
  const error = await onSubmit(data)
  if (error) setServerError(error)        // show the new one
},

// ...above the submit button
<ServerError error={serverError} />
```

כך הטופס נשאר כללי: הוא לא יודע אם הוא יוצר או עורך, ולא יודע לאיזו כתובת
לפנות. הדף מחליט.

## הכנת הנתונים לפני השליחה

מה שהשדות מחזיקים הוא לא תמיד מה שה־API מצפה לקבל. ממירים ב־`onSubmit`, לפני
שקוראים לדף:

```js
onSubmit: async ({ value }) => {
  const data = {
    title: value.title,
    content: value.content,
    dueDate: value.dueDate || null,   // empty date input → null ("no due date")
  }
  if (showStatus) data.status = value.status

  const error = await onSubmit(data)
  if (error) setServerError(error)
},
```

המרות נפוצות:

| השדה נותן | ה־API רוצה | ההמרה |
| --------- | ---------- | ----- |
| `''` בתאריך אופציונלי ריק | `null` | `value.dueDate || null` |
| `"3"` משדה מספר | `3` | `Number(value.quantity)` |
| `"2026-12-01T10:00"` מ־datetime-local | אותה מחרוזת | אין צורך, `z.iso.datetime({ local: true })` של Zod מקבל אותה |

## סיכום

| חלק | קוד |
| --- | --- |
| כללים | `z.object({...})`, עם אותן הודעות כמו בשרת |
| טופס | `useForm({ defaultValues, validators, onSubmit })` |
| שליחה | `<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>` |
| שדה | `<form.Field name="x">{(field) => <TextField field={field} label="X" />}</form.Field>` |
| כפתור שליחה | `form.Subscribe` + `isSubmitting` |
| שגיאות שרת | הדף מחזיר את גוף השגיאה, והטופס מציג `<ServerError>` |
