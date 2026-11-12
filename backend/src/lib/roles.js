import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";

// The roles in your project. Rename these to match your brief,
// e.g. { WORKER: "worker", SHIFT_LEAD: "shift_lead" }.
// Keep frontend/src/lib/roles.js in sync with this file.
export const ROLES = {
  MEMBER: "member",
  MANAGER: "manager",
};

// New sign-ups get this role.
export const DEFAULT_ROLE = ROLES.MEMBER;

// Better Auth's admin plugin needs to know what each role may do with its
// built-in user-management endpoints (list users, change roles, ban...).
// The manager gets full admin powers, everyone else gets none.
const ac = createAccessControl(defaultStatements);

export const authRoles = {
  [ROLES.MANAGER]: ac.newRole(adminAc.statements),
  [ROLES.MEMBER]: ac.newRole(userAc.statements),
};

export const ADMIN_ROLES = [ROLES.MANAGER];
