# 2. Form recipes

[← How forms work](01-how-forms-work.md) · [Back to the index](../README.md) · [עברית](../he/02-recipes.md)

Copy-paste solutions for the fields and situations your project needs.

## Text, email, password

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

## Long text

```jsx
<form.Field name="description">
  {(field) => <TextareaField field={field} label="Description" rows={5} />}
</form.Field>
```

## Optional fields

An optional text field still starts as `''` in `defaultValues`. In the schema,
allow the empty string:

```js
notes: z.string().max(500, 'At most 500 characters.'),   // '' is fine
```

## Number

Inputs always hold **strings**, even with `type="number"`. Keep the value as a
string in the form, let Zod check it as a number, and convert when sending:

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

## Select: a fixed list

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

## Select: options from the server

For example, choosing equipment for a reservation. Load the list in the page's
loader (see the [routing guide](../../routing/en/02-loading-data.md#several-requests-for-one-page)),
pass it to the form, and turn it into `{ value, label }`:

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

Start with `''`. The select shows the placeholder until something is chosen.
In the schema, require a choice:

```js
equipmentId: z.string().min(1, 'Choose a piece of equipment.'),
```

## Date

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

`<input type="date">` gives `"2026-12-01"`. When **editing**, the stored date
(`"2026-12-01T00:00:00.000Z"`) must be cut back to that format. Use
`toDateInputValue()` from `lib/format.js`:

```jsx
defaultValues={{ dueDate: toDateInputValue(note.dueDate) }}
```

## Date and time

```jsx
// schema
startTime: z.iso.datetime({ local: true, error: 'Choose a start time.' }),

// field
<form.Field name="startTime">
  {(field) => <TextField field={field} label="Start" type="datetime-local" />}
</form.Field>
```

The input gives `"2026-12-01T10:00"`, local time without a time zone. To fill
it when editing, you need the local date and time in that format:

```js
function toDateTimeInputValue(value) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
```

## One field must come after another

*"End time must be after start time"* (LabSlot) or *"The return date can't be
before the loan date"* (BoxBack). Add a `.refine()` to the whole schema;
`path` chooses which field shows the error:

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

The signup form uses the same idea for *"Passwords do not match"*
(`components/signup-form.jsx`). Comparing the strings works here because both
values have the same `YYYY-MM-DDTHH:mm` format.

A `.refine()` on the whole schema only runs once **all the other rules pass**.
So the "end after start" message appears after both times are filled in
correctly, not while other fields still have errors.

**The server must check it too.** See
[business-rules.md](../../business-rules.md#5-one-field-must-come-after-another).

## Checkbox

Add the component first: `npx shadcn@latest add checkbox`. Then connect it by
hand. A checkbox uses `checked` and `onCheckedChange` instead of `value` and
`onChange`:

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

Any other input works the same way: show `field.state.value`, call
`field.handleChange(...)` when it changes, and `field.handleBlur` when it loses
focus.

## One form for "new" and "edit"

Write the form once and pass it different starting values. `NoteForm` is used
by both dialogs:

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

Inside the form, the passed values override the defaults:

```js
defaultValues: { title: '', content: '', dueDate: '', status: 'open', ...defaultValues },
```

### Buttons in the footer: `children`

The submit button must be **inside** the `<form>`, but in a dialog it belongs
in the footer, next to Cancel or Delete. So `NoteForm` renders the dialog's
footer itself, and whatever you put between `<NoteForm>` and `</NoteForm>`
appears in the footer before the submit button:

```jsx
// inside NoteForm
<DialogFooter>
  {children}
  <Button type="submit">{submitLabel}</Button>
</DialogFooter>
```

Those extra buttons don't submit the form: buttons from `components/ui/button`
are `type="button"` unless you say `type="submit"`.

## Forms in dialogs

Both Notes dialogs follow the same pattern:

| | New note | Edit note |
| --- | --- | --- |
| File | `components/notes/new-note-dialog.jsx` | `components/notes/edit-note-dialog.jsx` |
| Opened by | The "New note" button | The "Edit" button on a note's card |
| On success | toast → close → `router.invalidate()` | the same |
| Footer | Cancel, Create note | Cancel, Save changes |

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

- `open` / `onOpenChange` let your code close the dialog after success.
- On error the dialog stays open and the form shows the message.
- `DialogClose` closes the dialog without saving.
- When the dialog closes, its content is removed. The next time it opens, the
  form is created again: empty for "new", with the **current** note for "edit".
  That's why the edit form always shows fresh values after saving.

### Confirmation dialogs: archive and delete

Actions that can't be undone (or change a lot) ask first. Archive and Delete
on each card use an `AlertDialog` (`archive-note-dialog.jsx`,
`delete-note-dialog.jsx`) with no form:

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

- `AlertDialogCancel` closes by itself. `AlertDialogAction` does **not**: it's a
  normal button, so your code closes the dialog with `setOpen(false)` after
  the request succeeds.
- `isPending` disables the button while the request runs, so a double click
  doesn't send it twice.

### Edit forms on a page: `key`

If your edit form is on a page instead of in a dialog (for example an issue
details page), it is **not** recreated after saving. `defaultValues` are only
read once, when the form is created, so after `router.invalidate()` the form
would keep its old state. Give it a `key` that changes on every save:

```jsx
<IssueForm key={issue.updatedAt} defaultValues={...} onSubmit={saveIssue} />
```

Changing `key` tells React to throw the form away and create a fresh one with
the new values.

## Read-only and disabled forms

Wrap the fields in a `<fieldset disabled>` to disable every input at once.
`NoteForm` does this for archived notes:

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

The footer is **outside** the fieldset on purpose, so buttons like Cancel keep
working when the fields are disabled. The submit button gets `disabled` itself.

The `Select` isn't a native input, so it also needs `disabled` passed directly
(see `SelectField` in `note-form.jsx`).

## A rule for one field only

Usually all rules belong in the schema. For a quick rule on one field, a field
can have its own validator. Return the error message, or `undefined` if valid:

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

## FAQ

### I press "Save" and nothing happens

A rule is failing on a field that isn't on the screen (e.g. it's hidden, or
you forgot to add its `<form.Field>`). Check that every key in the schema has a
field, and every field has a starting value in `defaultValues`. To see the
errors, temporarily add:

```jsx
<form.Subscribe selector={(state) => state.errors}>
  {(errors) => <pre>{JSON.stringify(errors, null, 2)}</pre>}
</form.Subscribe>
```

### The error message is "Invalid input: expected string, received undefined"

The field has no starting value. Add it to `defaultValues` (`''` for text,
`false` for a checkbox).

### Red errors appear as soon as the form opens

Use the field components; they only show errors after the field is touched. If
you wrote your own input, use `field.state.meta.isTouched && !field.state.meta.isValid`.

### The form keeps old values after saving

In a dialog, close the dialog after saving (`setOpen(false)`); it starts fresh next time. On a page, give the form a `key` that changes when the data changes (`key={item.updatedAt}`).

### The server says a field is invalid but the browser didn't

The two schemas are different. Copy the rules (and messages) from
`backend/src/schemas/` so both sides agree. The `ServerError` box shows the
server's messages anyway.

### Can I skip the browser validation and rely on the server?

It works, since the server shows its errors through `ServerError`, but the user
only finds out after pressing submit. Browser validation gives instant
feedback. Do both.
