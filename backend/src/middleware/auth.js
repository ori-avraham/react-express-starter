import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { httpError } from "../lib/http-error.js";

// Rejects the request with 401 unless the user is signed in.
// On success the signed-in user is available as req.user
// ({ id, name, email, role, ... }).
export async function requireAuth(req, _res, next) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    throw httpError(401, "You must be signed in.");
  }

  req.user = session.user;
  next();
}

// Rejects the request with 403 unless req.user has one of the given roles.
// Always use it after requireAuth:
//
//   router.post("/", requireAuth, requireRole(ROLES.MANAGER), createEvent);
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      throw httpError(401, "You must be signed in.");
    }

    if (!roles.includes(req.user.role)) {
      throw httpError(403, `Only ${roles.join(" or ")} users can do this.`);
    }

    next();
  };
}
