# Authentication guide · מדריך הזדהות

Everything about sign-up, sign-in, sessions, roles and permissions in this project.
Read the pages in order.

כל מה שצריך לדעת על הרשמה, התחברות, sessions, תפקידים והרשאות בפרויקט.
קראו את הדפים לפי הסדר.

| # | English | עברית | What you'll learn |
| - | ------- | ----- | ----------------- |
| 1 | [How auth works](en/01-how-auth-works.md) | [איך עובדת ההזדהות](he/01-how-auth-works.md) | Authentication vs authorization, password hashing, sessions and cookies, the Vite proxy |
| 2 | [The backend](en/02-backend.md) | [צד השרת](he/02-backend.md) | `auth.js`, `roles.js`, `requireAuth`, `requireRole`, ownership checks, creating users |
| 3 | [The frontend](en/03-frontend.md) | [צד הלקוח](he/03-frontend.md) | `authClient`, sign-in/up forms, `useSession()`, protected pages, hiding UI by role |
| 4 | [Recipes and FAQ](en/04-recipes-and-faq.md) | [מתכונים ושאלות נפוצות](he/04-recipes-and-faq.md) | Renaming roles, testing auth, common errors |

## In one minute · בדקה אחת

```
Sign in   → Better Auth checks the password hash → creates a session → sets an HttpOnly cookie
Request   → the browser sends the cookie → requireAuth turns it into req.user
Role rule → requireRole(ROLES.MANAGER) → 403 if the role doesn't match
Owner rule→ the controller compares note.owner with req.user.id → 403 if it's not theirs
Frontend  → authClient.useSession() to read the user · requireRole() to guard pages
```

**The golden rule · כלל הזהב:** the frontend *hides*, the backend *enforces*.
הממשק *מסתיר*, השרת *אוכף*.
