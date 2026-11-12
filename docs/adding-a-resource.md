# Adding a resource, step by step

A **resource** is one kind of thing your app manages: incidents, equipment,
reservations, loans, events... Each one needs the same set of files. The Notes
example has all of them, so the fastest way is to **copy the Notes files and
rename**.

This guide builds an `Equipment` resource (from LabSlot) as an example:
everyone can see equipment, only managers can add or edit it.

```
backend/src/models/equipment.model.js         1. What is stored
backend/src/schemas/equipment.schemas.js      2. What the client may send
backend/src/controllers/equipment.controller.js 3. What each endpoint does
backend/src/routes/equipment.routes.js        4. URLs and permissions
backend/src/app.js                            5. Mount the router
backend/src/seed.js                           6. Demo data
backend/docs/equipment.http                   7. Try it without the UI
frontend/src/routes/dashboard/equipment/...   8. Pages
frontend/src/components/app-sidebar.jsx       9. Sidebar link
```

> **Build the backend first and test it with the `.http` file.** Only start
> the pages when the API works. Debugging both at once is much harder.

---

## 0. Rename the roles (once per project)

Edit `backend/src/lib/roles.js` and `frontend/src/lib/roles.js` so the roles
match your brief. For example, LabSlot:

```js
export const ROLES = {
  STUDENT: "student",
  LAB_MANAGER: "lab_manager",
};
export const DEFAULT_ROLE = ROLES.STUDENT;
// ...
export const authRoles = {
  [ROLES.LAB_MANAGER]: ac.newRole(adminAc.statements),
  [ROLES.STUDENT]: ac.newRole(userAc.statements),
};
export const ADMIN_ROLES = [ROLES.LAB_MANAGER];
```

Then search the code for `ROLES.MANAGER` / `ROLES.MEMBER` and replace them, update
the demo users in `seed.js`, and run `npm run seed`.

Also set your project name in `frontend/src/lib/config.js`.

---

## 1. Model: what is stored

`backend/src/models/equipment.model.js`

```js
import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Equipment = mongoose.model("Equipment", equipmentSchema);
```

**Relations.** To point at another document, store its id with `ref`:

```js
// in reservation.model.js
user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
```

and load it with `.populate("equipment", "name")`. Users are created by Better
Auth; always reference them with `ref: "User"` (see `models/user.model.js`).

## 2. Schemas: what the client may send

`backend/src/schemas/equipment.schemas.js`

```js
import * as z from "zod";

export const equipmentIdParams = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid equipment id."),
});

export const createEquipmentBody = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  description: z.string().trim().max(500).optional(),
});

export const updateEquipmentBody = createEquipmentBody.partial().extend({
  isActive: z.boolean().optional(),
});
```

Never put fields the server decides (owner, status, createdAt) in a create
schema. The server sets those itself.

## 3. Controller: what each endpoint does

`backend/src/controllers/equipment.controller.js`

```js
import { httpError } from "../lib/http-error.js";
import { Equipment } from "../models/equipment.model.js";

export async function listEquipment(_req, res) {
  const items = await Equipment.find().sort({ name: 1 });
  res.json(items);
}

export async function createEquipment(req, res) {
  const item = await Equipment.create(req.valid.body);
  res.status(201).json(item);
}

export async function updateEquipment(req, res) {
  const item = await Equipment.findById(req.valid.params.id);
  if (!item) throw httpError(404, "Equipment not found.");

  Object.assign(item, req.valid.body);
  await item.save();
  res.json(item);
}
```

- Use `req.valid.body` / `req.valid.params` / `req.valid.query`: they are already checked.
- Use `req.user` for the signed-in user (`req.user.id`, `req.user.role`).
- `throw httpError(status, message)` to stop with an error. No try/catch needed:
  Express 5 sends thrown errors to `onError` automatically.
- **Business rules go here.** See [business-rules.md](business-rules.md).

## 4. Router: URLs and permissions

`backend/src/routes/equipment.routes.js`

```js
import { Router } from "express";
import {
  createEquipment,
  listEquipment,
  updateEquipment,
} from "../controllers/equipment.controller.js";
import { ROLES } from "../lib/roles.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createEquipmentBody,
  equipmentIdParams,
  updateEquipmentBody,
} from "../schemas/equipment.schemas.js";

export const equipmentRouter = Router();

equipmentRouter.use(requireAuth);

equipmentRouter.get("/", listEquipment);

equipmentRouter.post(
  "/",
  requireRole(ROLES.LAB_MANAGER),
  validate("body", createEquipmentBody),
  createEquipment,
);

equipmentRouter.patch(
  "/:id",
  requireRole(ROLES.LAB_MANAGER),
  validate("params", equipmentIdParams),
  validate("body", updateEquipmentBody),
  updateEquipment,
);
```

Order matters: `requireAuth` → `requireRole` → `validate` → controller.

## 5. Mount the router

In `backend/src/app.js`, next to the notes router:

```js
import { equipmentRouter } from "./routes/equipment.routes.js";
// ...
app.use("/api/equipment", equipmentRouter);
```

## 6. Demo data

In `backend/src/seed.js`, add the model to `appModels` and create some items:

```js
const appModels = [Note, Equipment];
// ...
const [arduino] = await Equipment.create([
  { name: "Arduino kit #1" },
  { name: "Camera Canon M50" },
  { name: "Old projector", isActive: false },
]);
```

Run `npm run seed`.

## 7. Test it with a `.http` file

Copy `backend/docs/notes.http` to `backend/docs/equipment.http` and change the
requests. Check the happy path **and** the failures: wrong role (403), invalid
data (400), not found (404). These requests are also your test evidence for
the project book.

---

## 8. Pages

Copy `frontend/src/routes/dashboard/notes/` to
`frontend/src/routes/dashboard/equipment/` (and `components/notes/` to
`components/equipment/`) and rename. The router plugin
regenerates `routeTree.gen.ts` automatically while `npm run dev` runs.

**List page:** `equipment/index.jsx`

```jsx
export const Route = createFileRoute('/dashboard/equipment/')({
  loader: async () => {
    const response = await fetch('/api/equipment')
    const data = await response.json()
    if (!response.ok) throw new Error(data.message)
    return data
  },
  component: EquipmentPage,
})

function EquipmentPage() {
  const items = Route.useLoaderData()
  const { data: session } = authClient.useSession()
  const isLabManager = session?.user.role === ROLES.LAB_MANAGER
  // render cards like notes/index.jsx;
  // show the "New" button only if isLabManager
}
```

- The **loader** fetches before the page shows. Loading and error states are
  handled for you (`PagePending` / `PageError` in `components/page-states.jsx`).
- Show `<EmptyState>` when the list is empty.
- Call the API with plain `fetch('/api/...')`. In development Vite forwards
  `/api` to the backend, and the session cookie is sent automatically.
- The signed-in user and their role come from `authClient.useSession()`.

**Form:** copy `components/notes/note-form.jsx`. Keep the Zod schema the same
as the backend one. Use `TextField`, `TextareaField`, `SelectField` from
`components/form-fields.jsx`. To show the server's errors, return the error
body from `onSubmit` (it appears in `<ServerError>`):

```jsx
async function createEquipment(data) {
  const response = await fetch('/api/equipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) return response.json() // { message, errors }
  toast.success('Equipment added')
  setOpen(false)
  await router.invalidate()
}
```

To create and edit items in dialogs, copy `components/notes/new-note-dialog.jsx` and
`components/notes/edit-note-dialog.jsx`. For cards with action buttons and
confirmation dialogs, see `note-card.jsx`, `archive-note-dialog.jsx` and
`delete-note-dialog.jsx`.

**After a change:** call `toast.success('...')`, then either
`navigate({ to: '...' })` or `router.invalidate()` to reload the page's data.

**Manager-only page:** add `beforeLoad: requireRole(ROLES.LAB_MANAGER)`
(see `routes/dashboard/users.jsx`).

**Need data for a dropdown?** Load it in the same loader:

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
```

## 9. Sidebar link

Add an entry to `navItems` in `frontend/src/components/app-sidebar.jsx`.
Pick an icon from https://lucide.dev/icons:

```js
{ title: 'Equipment', to: '/dashboard/equipment', icon: WrenchIcon },
{ title: 'All reservations', to: '/dashboard/reservations', icon: CalendarIcon, roles: [ROLES.LAB_MANAGER] },
```

---

## Checklist for every resource

- [ ] Model with `required`, `enum`, defaults, and `ref` for relations
- [ ] Zod schemas for body / params / query
- [ ] Router with `requireAuth`, plus `requireRole` where the brief says "only X can..."
- [ ] Ownership checks in the controller ("users can only edit their own...")
- [ ] Business rules in the controller, returning 409 with a clear message
- [ ] Demo data in `seed.js`
- [ ] `.http` file with success **and** failure requests
- [ ] Pages: loading, error, empty and success (toast) states
- [ ] Buttons hidden for roles that may not use them (the server still checks!)
