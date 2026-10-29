import { Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { LoaderCircle } from "lucide-react"
import * as z from "zod"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

export function LoginForm({ className, ...props }) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState("")
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onChange: loginSchema, onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setServerError("")
      const result = await authClient.signIn.email(value)
      if (result.error) {
        setServerError(result.error.message || "Unable to sign in.")
        return
      }
      await navigate({ to: "/dashboard" })
    },
  })

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader><CardTitle>Login to your account</CardTitle><CardDescription>Enter your email below to login to your account</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); form.handleSubmit() }}>
            <FieldGroup>
              <form.Field name="email">{(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return <Field data-invalid={isInvalid}><FieldLabel htmlFor={field.name}>Email</FieldLabel><Input id={field.name} name={field.name} type="email" placeholder="m@example.com" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={isInvalid} />{isInvalid && <FieldError errors={field.state.meta.errors} />}</Field>
              }}</form.Field>
              <form.Field name="password">{(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                return <Field data-invalid={isInvalid}><div className="flex items-center"><FieldLabel htmlFor={field.name}>Password</FieldLabel><a href="/signin" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">Forgot your password?</a></div><Input id={field.name} name={field.name} type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} aria-invalid={isInvalid} />{isInvalid && <FieldError errors={field.state.meta.errors} />}</Field>
              }}</form.Field>
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
              <Field><Button type="submit" disabled={form.state.isSubmitting}>{form.state.isSubmitting && <LoaderCircle className="animate-spin" />} {form.state.isSubmitting ? "Signing in…" : "Login"}</Button><FieldDescription className="text-center">Don&apos;t have an account? <Link to="/signup" className="underline underline-offset-4">Sign up</Link></FieldDescription></Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
