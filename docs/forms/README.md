# Forms guide · מדריך טפסים

How forms work in this project (TanStack Form + Zod + the ready-made field
components), and recipes for every kind of field your project needs.

איך עובדים טפסים בפרויקט (TanStack Form + Zod + רכיבי השדות המוכנים), ומתכונים
לכל סוג שדה שהפרויקט שלכם צריך.

| # | English | עברית | What you'll learn |
| - | ------- | ----- | ----------------- |
| 1 | [How forms work](en/01-how-forms-work.md) | [איך עובדים טפסים](he/01-how-forms-work.md) | The four parts of a form, the `field` object, `TextField` and friends, when errors appear, the submit button, server errors |
| 2 | [Recipes](en/02-recipes.md) | [מתכונים](he/02-recipes.md) | Numbers, selects (also from the server), dates and times, "end after start", checkboxes, new/edit forms, dialogs, FAQ |

## In one minute · בדקה אחת

```jsx
const schema = z.object({ title: z.string().min(3, 'Title must be at least 3 characters.') })

const form = useForm({
  defaultValues: { title: '' },
  validators: { onChange: schema, onSubmit: schema },
  onSubmit: async ({ value }) => {
    const error = await onSubmit(value)   // the page returns { message, errors } on failure
    if (error) setServerError(error)
  },
})

<form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
  <form.Field name="title">
    {(field) => <TextField field={field} label="Title" />}
  </form.Field>
  <ServerError error={serverError} />
  <Button type="submit">Save</Button>
</form>
```

**The golden rule · כלל הזהב:** the same rules in the browser (for speed) and
on the server (for safety).
אותם כללים בדפדפן (בשביל מהירות) ובשרת (בשביל אבטחה).
