import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// Ready-made inputs for TanStack Form. They show the label and the
// validation errors for you:
//
//   <form.Field name="title">
//     {(field) => <TextField field={field} label="Title" />}
//   </form.Field>

function useFieldState(field) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  return { isInvalid, errors: field.state.meta.errors }
}

// type can be "text", "email", "number", "date", "datetime-local"...
export function TextField({ field, label, type = 'text', ...props }) {
  const { isInvalid, errors } = useFieldState(field)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={isInvalid}
        {...props}
      />
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  )
}

export function TextareaField({ field, label, ...props }) {
  const { isInvalid, errors } = useFieldState(field)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={isInvalid}
        {...props}
      />
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  )
}

// options: [{ value: 'open', label: 'Open' }, ...]
export function SelectField({ field, label, options, placeholder, ...props }) {
  const { isInvalid, errors } = useFieldState(field)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        items={options}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        {...props}
      >
        <SelectTrigger
          id={field.name}
          className="w-full"
          aria-invalid={isInvalid}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  )
}

// Shows the error body returned by the server after submitting a form:
// { message: '...', errors?: { title: ['...'] } }
export function ServerError({ error }) {
  if (!error) return null
  const fieldMessages = Object.values(error.errors || {}).flat()

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <p>{error.message}</p>
      {fieldMessages.length > 0 && (
        <ul className="mt-1 ml-4 list-disc">
          {fieldMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
