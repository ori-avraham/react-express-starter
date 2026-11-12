# 1. How forms work

[Next: recipes →](02-recipes.md) · [עברית](../he/01-how-forms-work.md)

Forms in this project use **TanStack Form** for the form's state, **Zod** for
the rules, and ready-made field components from
`frontend/src/components/form-fields.jsx`.

The full example is `frontend/src/components/notes/note-form.jsx`. This page
takes it apart.

## Why a form library?

A form needs more than `useState` for each input. It must know each field's
value, whether the user has touched it, its errors, whether the form is being
submitted, and when to show what. TanStack Form keeps track of all of that, so
your code only describes **the fields, the rules and what happens on submit**.

## The four parts of a form

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

### 1. The rules: a Zod schema

```js
const noteSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.'),
})
```

One entry per field. The message is what the user sees. Keep it the **same as
the backend schema** (`backend/src/schemas/*.schemas.js`), so the browser and
the server agree.

> Zod checks the value, but **doesn't change** what the form holds. `.trim()`
> makes `"  ab  "` fail `min(3)`, but `value.title` in `onSubmit` still has the
> spaces. The backend schema trims before saving.

### 2. `useForm`: the form itself

```js
const form = useForm({
  defaultValues: { title: '', content: '' },
  validators: { onChange: noteSchema, onSubmit: noteSchema },
  onSubmit: async ({ value }) => { ... },
})
```

| Option | Meaning |
| ------ | ------- |
| `defaultValues` | The starting value of **every** field. Text fields start as `''`, never `undefined`. |
| `validators.onChange` | Check the rules on every keystroke. |
| `validators.onSubmit` | Check again when the form is submitted. |
| `onSubmit` | Runs only when **all** rules pass. `value` holds every field. |

### 3. The `<form>` element

```jsx
<form
  onSubmit={(event) => {
    event.preventDefault()   // stop the browser from reloading the page
    form.handleSubmit()      // validate, then call onSubmit if valid
  }}
>
```

The submit button must be `type="submit"`. Pressing Enter in a field also
submits.

### 4. The fields: `<form.Field>`

```jsx
<form.Field name="title">
  {(field) => <TextField field={field} label="Title" />}
</form.Field>
```

This pattern is called a **render prop**: instead of normal children,
`<form.Field>` receives a **function**. TanStack Form calls it with a `field`
object for `title`, and you return the input to show. Read it as: *"for the
field `title`, draw a `TextField` connected to it."*

`name` must match a key in `defaultValues`.

## What's inside `field`

| Property | Meaning |
| -------- | ------- |
| `field.name` | `"title"` |
| `field.state.value` | The current value |
| `field.handleChange(newValue)` | Set the value (call it in `onChange`) |
| `field.handleBlur()` | Mark the field as touched (call it in `onBlur`) |
| `field.state.meta.isTouched` | The user has left the field at least once (or submitted) |
| `field.state.meta.isValid` | No errors |
| `field.state.meta.errors` | The error messages from Zod |

## The field components: `components/form-fields.jsx`

Connecting an input by hand takes about 20 lines. `TextField` does it for you:

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

- **`isInvalid`** is true only when the field has errors **and** was touched.
  So a new, empty form doesn't greet the user with red messages; errors
  appear after they leave a field, or press submit.
- Extra props (`placeholder`, `rows`, `min`, `disabled`...) go straight to the
  input through `{...props}`.

Available components:

| Component | For |
| --------- | --- |
| `TextField` | Text, email, password, number, date, datetime-local (`type="..."`) |
| `TextareaField` | Long text |
| `SelectField` | Choosing one option from a list |
| `ServerError` | The error returned by the server (see below) |

## When does what happen?

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

## The submit button: `form.Subscribe`

While `onSubmit` is waiting for the server, the button should be disabled, so
the user can't send the form twice:

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

`form.Subscribe` is another render prop: it re-draws only the button when
`isSubmitting` changes, not the whole form. `isSubmitting` is true for as long
as your `onSubmit` function hasn't finished, so keep the `await` on the
request inside it.

## Errors from the server

The browser can't check everything. *"This title already exists"* or
*"Archived notes cannot be edited"* are only known on the server. It answers
with:

```json
{ "message": "Some fields are invalid.", "errors": { "title": ["Title must be at least 3 characters."] } }
```

`NoteForm` shows that with the `ServerError` component. The contract is
simple: **the page's `onSubmit` returns the error body if the request failed,
or nothing if it succeeded.**

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

This keeps the form reusable: it doesn't know whether it creates or edits, or
which URL to call. The page decides.

## Preparing the data before sending

What the inputs hold is not always what the API expects. Convert in
`onSubmit`, before calling the page:

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

Common conversions:

| Input gives | API wants | Convert |
| ----------- | --------- | ------- |
| `''` for an empty optional date | `null` | `value.dueDate || null` |
| `"3"` from a number input | `3` | `Number(value.quantity)` |
| `"2026-12-01T10:00"` from datetime-local | the same string | nothing; Zod's `z.iso.datetime({ local: true })` accepts it |

## Summary

| Part | Code |
| ---- | ---- |
| Rules | `z.object({...})`, same messages as the backend |
| Form | `useForm({ defaultValues, validators, onSubmit })` |
| Submit | `<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>` |
| A field | `<form.Field name="x">{(field) => <TextField field={field} label="X" />}</form.Field>` |
| Submit button | `form.Subscribe` + `isSubmitting` |
| Server errors | The page returns the error body; the form shows `<ServerError>` |
