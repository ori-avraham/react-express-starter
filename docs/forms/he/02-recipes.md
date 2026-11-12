# 2. מתכונים לטפסים

[→ איך עובדים טפסים](01-how-forms-work.md) · [חזרה לתוכן העניינים](../README.md) · [English](../en/02-recipes.md)

פתרונות מוכנים להעתקה, לשדות ולמצבים שהפרויקט שלכם צריך.

## טקסט, אימייל, סיסמה

```jsx
// schema
name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
email: z.email('Enter a valid email address.'),
phone: z.string().regex(/^0\d{8,9}$/, 'Enter a valid phone number.'),

// fields
<form.Field name="name">
  {(field) => <TextField field={field} label="Full name" />}
</form.Field>
<form.Field name="email">
  {(field) => <TextField field={field} label="Email" type="email" />}
</form.Field>
```

## טקסט ארוך

```jsx
<form.Field name="description">
  {(field) => <TextareaField field={field} label="Description" rows={5} />}
</form.Field>
```

## שדות אופציונליים

גם שדה טקסט אופציונלי מתחיל ב־`''` ב־`defaultValues`. בסכמה, אפשרו מחרוזת ריקה:

```js
notes: z.string().max(500, 'At most 500 characters.'),   // '' is fine
```

## מספר

שדות קלט מחזיקים תמיד **מחרוזות**, גם עם `type="number"`. השאירו את הערך
כמחרוזת בטופס, תנו ל־Zod לבדוק אותו כמספר, והמירו בשליחה:

```jsx
// defaultValues
quantity: '',

// schema: z.coerce turns "3" into 3 before checking
quantity: z.coerce
  .number({ error: 'Enter a number.' })
  .int('Whole numbers only.')
  .positive('Quantity must be positive.'),

// field
<form.Field name="quantity">
  {(field) => <TextField field={field} label="Quantity" type="number" min={1} />}
</form.Field>

// onSubmit
const data = { ...value, quantity: Number(value.quantity) }
```

## רשימה נפתחת: רשימה קבועה

```jsx
const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

// defaultValues
priority: 'medium',

// schema
priority: z.enum(['low', 'medium', 'high']),

// field
<form.Field name="priority">
  {(field) => <SelectField field={field} label="Priority" options={priorityOptions} />}
</form.Field>
```

## רשימה נפתחת: אפשרויות מהשרת

למשל, בחירת ציוד להזמנה. טוענים את הרשימה ב־loader של הדף (ראו את
[מדריך הניתוב](../../routing/he/02-loading-data.md#כמה-בקשות-לדף-אחד)), מעבירים
אותה לטופס, והופכים אותה ל־`{ value, label }`:

```jsx
function ReservationForm({ equipment, onSubmit }) {
  const equipmentOptions = equipment.map((item) => ({
    value: item.id,
    label: item.name,
  }))

  const form = useForm({
    defaultValues: { equipmentId: '', startTime: '', endTime: '' },
    // ...
  })

  // ...
  <form.Field name="equipmentId">
    {(field) => (
      <SelectField
        field={field}
        label="Equipment"
        options={equipmentOptions}
        placeholder="Choose equipment"
      />
    )}
  </form.Field>
}
```

מתחילים ב־`''`. הרשימה מציגה את ה־placeholder עד שבוחרים משהו. בסכמה, דורשים
בחירה:

```js
equipmentId: z.string().min(1, 'Choose a piece of equipment.'),
```

## תאריך

```jsx
// defaultValues
dueDate: '',

// schema: required
dueDate: z.iso.date('Choose a date.'),
// schema: optional
dueDate: z.union([z.literal(''), z.iso.date('Choose a valid date.')]),

// field
<form.Field name="dueDate">
  {(field) => <TextField field={field} label="Due date" type="date" />}
</form.Field>

// onSubmit, if optional
dueDate: value.dueDate || null,
```

`<input type="date">` נותן `"2026-12-01"`. ב**עריכה**, צריך לקצר את התאריך
השמור (`"2026-12-01T00:00:00.000Z"`) בחזרה לפורמט הזה. השתמשו
ב־`toDateInputValue()` מתוך `lib/format.js`:

```jsx
defaultValues={{ dueDate: toDateInputValue(note.dueDate) }}
```

## תאריך ושעה

```jsx
// schema
startTime: z.iso.datetime({ local: true, error: 'Choose a start time.' }),

// field
<form.Field name="startTime">
  {(field) => <TextField field={field} label="Start" type="datetime-local" />}
</form.Field>
```

השדה נותן `"2026-12-01T10:00"`: שעה מקומית בלי אזור זמן. כדי למלא אותו בעריכה,
צריך את התאריך והשעה המקומיים בפורמט הזה:

```js
function toDateTimeInputValue(value) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
```

## שדה אחד חייב להיות אחרי שדה אחר

*"זמן הסיום חייב להיות אחרי זמן ההתחלה"* (LabSlot) או *"תאריך ההחזרה לא יכול
להיות לפני תאריך ההשאלה"* (BoxBack). מוסיפים `.refine()` לסכמה כולה, ו־`path`
קובע ליד איזה שדה תופיע השגיאה:

```js
const reservationSchema = z
  .object({
    equipmentId: z.string().min(1, 'Choose a piece of equipment.'),
    startTime: z.iso.datetime({ local: true, error: 'Choose a start time.' }),
    endTime: z.iso.datetime({ local: true, error: 'Choose an end time.' }),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  })
```

טופס ההרשמה משתמש באותו רעיון עבור *"Passwords do not match"*
(`components/signup-form.jsx`). השוואת מחרוזות עובדת כאן, כי לשני הערכים יש
אותו פורמט `YYYY-MM-DDTHH:mm`.

`.refine()` על הסכמה כולה רץ רק אחרי ש**כל שאר הכללים עוברים**. לכן ההודעה
"סיום אחרי התחלה" מופיעה רק אחרי ששני הזמנים מולאו נכון, ולא כל עוד יש שגיאות
בשדות אחרים.

**גם השרת חייב לבדוק את זה.** ראו
[business-rules.md](../../business-rules.md#5-one-field-must-come-after-another).

## תיבת סימון (Checkbox)

קודם מוסיפים את הרכיב: `npx shadcn@latest add checkbox`. אחר כך מחברים אותו
ידנית. תיבת סימון משתמשת ב־`checked` וב־`onCheckedChange` במקום `value`
ו־`onChange`:

```jsx
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'

// defaultValues
isActive: true,

// schema
isActive: z.boolean(),

// field
<form.Field name="isActive">
  {(field) => (
    <Field orientation="horizontal">
      <Checkbox
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
      />
      <FieldLabel htmlFor={field.name}>Available for reservations</FieldLabel>
    </Field>
  )}
</form.Field>
```

כל שדה קלט אחר עובד באותה צורה: מציגים את `field.state.value`, קוראים
ל־`field.handleChange(...)` כשהוא משתנה, ול־`field.handleBlur` כשהוא מאבד
פוקוס.

## טופס אחד ל"חדש" ול"עריכה"

כותבים את הטופס פעם אחת ומעבירים לו ערכים התחלתיים שונים. שני הדיאלוגים משתמשים
ב־`NoteForm`:

```jsx
// New: no defaultValues, so the form's own defaults are used
<NoteForm onSubmit={createNote} submitLabel="Create note">
  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
</NoteForm>

// Edit: start from the note that was clicked
<NoteForm
  defaultValues={{
    title: note.title,
    content: note.content,
    dueDate: toDateInputValue(note.dueDate),
    status: note.status,
  }}
  onSubmit={saveNote}
  submitLabel="Save changes"
  showStatus
>
  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
</NoteForm>
```

בתוך הטופס, הערכים שהועברו דורסים את ברירות המחדל:

```js
defaultValues: { title: '', content: '', dueDate: '', status: 'open', ...defaultValues },
```

### כפתורים ב־footer: `children`

כפתור השליחה חייב להיות **בתוך** ה־`<form>`, אבל בדיאלוג המקום שלו הוא
ב־footer, ליד Cancel או Delete. לכן `NoteForm` מצייר בעצמו את ה־footer של
הדיאלוג, וכל מה ששמים בין `<NoteForm>` ל־`</NoteForm>` מופיע ב־footer לפני
כפתור השליחה:

```jsx
// inside NoteForm
<DialogFooter>
  {children}
  <Button type="submit">{submitLabel}</Button>
</DialogFooter>
```

הכפתורים הנוספים לא שולחים את הטופס: כפתורים מ־`components/ui/button` הם
`type="button"`, אלא אם כותבים `type="submit"`.

## טפסים בתוך דיאלוגים

שני הדיאלוגים של הפתקים עובדים לפי אותה תבנית:

| | פתק חדש | עריכת פתק |
| --- | --- | --- |
| קובץ | `components/notes/new-note-dialog.jsx` | `components/notes/edit-note-dialog.jsx` |
| נפתח על ידי | הכפתור "New note" | הכפתור "Edit" בכרטיס של פתק |
| בהצלחה | toast ← סגירה ← `router.invalidate()` | אותו דבר |
| footer | Cancel, Create note | Cancel, Save changes |

```jsx
export function EditNoteDialog({ note }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function saveNote(data) {
    const response = await fetch(`/api/notes/${note.id}`, { method: 'PATCH', ... })
    if (!response.ok) return response.json()   // stay open, show the error

    toast.success('Note saved')
    setOpen(false)                             // close
    await router.invalidate()                  // refresh the list behind it
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon /> Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>
        <NoteForm defaultValues={...} onSubmit={saveNote} submitLabel="Save changes" showStatus>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        </NoteForm>
      </DialogContent>
    </Dialog>
  )
}

// in the card's footer (components/notes/note-card.jsx)
<CardFooter className="gap-2">
  <EditNoteDialog note={note} />
  {isManager && !isArchived && <ArchiveNoteDialog note={note} />}
  <DeleteNoteDialog note={note} className="ml-auto" />
</CardFooter>
```

- `open` / `onOpenChange` מאפשרים לקוד שלכם לסגור את הדיאלוג אחרי הצלחה.
- בשגיאה הדיאלוג נשאר פתוח והטופס מציג את ההודעה.
- `DialogClose` סוגר את הדיאלוג בלי לשמור.
- כשהדיאלוג נסגר התוכן שלו מוסר. בפעם הבאה שהוא נפתח, הטופס נוצר מחדש: ריק
  ב"חדש", ועם הפתק **העדכני** ב"עריכה". בגלל זה טופס העריכה תמיד מציג ערכים
  עדכניים אחרי שמירה.

### דיאלוגים לאישור: ארכוב ומחיקה

פעולות שאי אפשר לבטל (או שמשנות הרבה) מבקשות אישור קודם. הכפתורים Archive
ו־Delete בכל כרטיס משתמשים ב־`AlertDialog` (`archive-note-dialog.jsx`,
`delete-note-dialog.jsx`), בלי טופס:

```jsx
export function ArchiveNoteDialog({ note }) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function archiveNote() {
    setIsPending(true)
    const response = await fetch(`/api/notes/${note.id}/archive`, { method: 'PATCH' })
    setIsPending(false)

    if (!response.ok) {
      const { message } = await response.json()
      toast.error(message)        // stay open
      return
    }

    toast.success('Note archived')
    setOpen(false)
    await router.invalidate()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <ArchiveIcon /> Archive
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive "{note.title}"?</AlertDialogTitle>
          <AlertDialogDescription>Archived notes become read-only.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={archiveNote} disabled={isPending}>
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- `AlertDialogCancel` נסגר לבד. `AlertDialogAction` **לא**: הוא כפתור רגיל,
  ולכן הקוד שלכם סוגר את הדיאלוג עם `setOpen(false)` אחרי שהבקשה הצליחה.
- `isPending` משבית את הכפתור בזמן שהבקשה רצה, כדי שלחיצה כפולה לא תשלח אותה
  פעמיים.

### טופס עריכה בתוך דף: `key`

אם טופס העריכה שלכם נמצא בדף ולא בדיאלוג (למשל דף פרטי ליקוי), הוא **לא** נוצר
מחדש אחרי שמירה. את `defaultValues` קוראים רק פעם אחת, כשהטופס נוצר, ולכן אחרי
`router.invalidate()` הטופס היה נשאר עם המצב הישן. תנו לו `key` שמשתנה בכל
שמירה:

```jsx
<IssueForm key={issue.updatedAt} defaultValues={...} onSubmit={saveIssue} />
```

שינוי של `key` אומר ל־React לזרוק את הטופס וליצור טופס חדש עם הערכים החדשים.

## טפסים לקריאה בלבד ומושבתים

עוטפים את השדות ב־`<fieldset disabled>` כדי להשבית את כל השדות בבת אחת.
`NoteForm` עושה את זה לפתקים בארכיון:

```jsx
<form ...>
  <fieldset disabled={disabled}>
    ...fields...
  </fieldset>
  <ServerError error={serverError} />
  <DialogFooter>
    {children}
    <Button type="submit" disabled={disabled || isSubmitting}>...</Button>
  </DialogFooter>
</form>
```

ה־footer נמצא **מחוץ** ל־fieldset בכוונה, כדי שכפתורים כמו Cancel ימשיכו לעבוד
כשהשדות מושבתים. כפתור השליחה מקבל `disabled` בעצמו.

ה־`Select` הוא לא שדה קלט רגיל של הדפדפן, ולכן צריך להעביר לו גם `disabled`
ישירות (ראו את `SelectField` ב־`note-form.jsx`).

## כלל לשדה אחד בלבד

בדרך כלל כל הכללים שייכים לסכמה. לכלל מהיר על שדה אחד, לשדה יכול להיות בודק
משלו. מחזירים את הודעת השגיאה, או `undefined` אם הערך תקין:

```jsx
<form.Field
  name="code"
  validators={{
    onChange: ({ value }) =>
      value.startsWith('LAB-') ? undefined : 'The code must start with LAB-.',
  }}
>
  {(field) => <TextField field={field} label="Code" />}
</form.Field>
```

---

## שאלות נפוצות

### אני לוחץ על "Save" ושום דבר לא קורה

כלל נכשל בשדה שלא מוצג על המסך (למשל הוא מוסתר, או ששכחתם להוסיף לו
`<form.Field>`). בדקו שלכל מפתח בסכמה יש שדה, ושלכל שדה יש ערך התחלתי
ב־`defaultValues`. כדי לראות את השגיאות, הוסיפו זמנית:

```jsx
<form.Subscribe selector={(state) => state.errors}>
  {(errors) => <pre>{JSON.stringify(errors, null, 2)}</pre>}
</form.Subscribe>
```

### הודעת השגיאה היא "Invalid input: expected string, received undefined"

לשדה אין ערך התחלתי. הוסיפו אותו ל־`defaultValues` (`''` לטקסט, `false`
לתיבת סימון).

### שגיאות אדומות מופיעות ברגע שהטופס נפתח

השתמשו ברכיבי השדות, הם מציגים שגיאות רק אחרי שנגעו בשדה. אם כתבתם שדה משלכם,
השתמשו ב־`field.state.meta.isTouched && !field.state.meta.isValid`.

### הטופס שומר על ערכים ישנים אחרי שמירה

בדיאלוג, סגרו את הדיאלוג אחרי השמירה (`setOpen(false)`), והוא ייפתח נקי בפעם הבאה. בדף, תנו לטופס `key` שמשתנה כשהנתונים משתנים (`key={item.updatedAt}`).

### השרת אומר ששדה לא תקין, אבל הדפדפן לא אמר

שתי הסכמות שונות. העתיקו את הכללים (וההודעות) מ־`backend/src/schemas/`, כדי
ששני הצדדים יסכימו. תיבת ה־`ServerError` מציגה בכל מקרה את ההודעות של השרת.

### אפשר לוותר על הבדיקה בדפדפן ולסמוך על השרת?

זה עובד, כי השרת מציג את השגיאות שלו דרך `ServerError`, אבל המשתמש מגלה את
הבעיה רק אחרי שהוא לוחץ על שליחה. בדיקה בדפדפן נותנת משוב מיידי. עשו את שתיהן.
