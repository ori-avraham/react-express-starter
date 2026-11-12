import { useForm } from '@tanstack/react-form'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import * as z from 'zod'
import {
  SelectField,
  ServerError,
  TextareaField,
  TextField,
} from '@/components/form-fields'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'

// The same rules as backend/src/schemas/note.schemas.js. Checking in the
// browser gives instant feedback; the server checks again because the
// browser can be bypassed.
const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(100, 'Title must be at most 100 characters.'),
  content: z.string().max(2000, 'Content must be at most 2000 characters.'),
  dueDate: z.string(),
  status: z.enum(['open', 'done']),
})

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
]

// Used inside the "new note" and "edit note" dialogs. The submit button is
// rendered in the dialog's footer, after any extra buttons passed as
// children (Cancel, Archive, Delete...).
//
// onSubmit receives the values ready to send to the API. If the request
// fails, return the server's error body ({ message, errors }) and the form
// shows it above the footer.
export function NoteForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
  showStatus = false,
  disabled = false,
  children,
}) {
  const [serverError, setServerError] = useState(null)

  const form = useForm({
    defaultValues: {
      title: '',
      content: '',
      dueDate: '',
      status: 'open',
      ...defaultValues,
    },
    validators: { onChange: noteSchema, onSubmit: noteSchema },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const data = {
        title: value.title,
        content: value.content,
        dueDate: value.dueDate || null, // empty input means "no due date"
      }
      if (showStatus) data.status = value.status

      const error = await onSubmit(data)
      if (error) setServerError(error)
    },
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Disables every field at once (e.g. for archived notes). The footer
          is outside it, so buttons like Delete keep working. */}
      <fieldset disabled={disabled}>
        <FieldGroup>
          <form.Field name="title">
            {(field) => <TextField field={field} label="Title" />}
          </form.Field>
          <form.Field name="content">
            {(field) => (
              <TextareaField field={field} label="Content" rows={5} />
            )}
          </form.Field>
          <form.Field name="dueDate">
            {(field) => (
              <TextField field={field} label="Due date" type="date" />
            )}
          </form.Field>
          {showStatus && (
            <form.Field name="status">
              {(field) => (
                <SelectField
                  field={field}
                  label="Status"
                  options={statusOptions}
                  disabled={disabled}
                />
              )}
            </form.Field>
          )}
        </FieldGroup>
      </fieldset>
      <ServerError error={serverError} />
      <DialogFooter>
        {children}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={disabled || isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
