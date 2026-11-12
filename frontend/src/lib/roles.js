// Must match backend/src/lib/roles.js.
export const ROLES = {
  MEMBER: 'member',
  MANAGER: 'manager',
}

// How each role is shown in the UI.
export const ROLE_LABELS = {
  [ROLES.MEMBER]: 'Member',
  [ROLES.MANAGER]: 'Manager',
}
