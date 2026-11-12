# Request flow guide · מדריך מסלול הבקשה

Follow one click from the browser to the database and back, then learn the
Express and REST ideas behind it. This guide ties all the other guides together.

עקבו אחרי לחיצה אחת מהדפדפן למסד הנתונים ובחזרה, ואז למדו את הרעיונות של
Express ו־REST שמאחוריה. המדריך הזה מחבר את כל המדריכים האחרים.

| # | English | עברית | What you'll learn |
| - | ------- | ----- | ----------------- |
| 1 | [The journey of a request](en/01-the-journey.md) | [המסע של בקשה](he/01-the-journey.md) | "Create note", step by step: form → fetch → proxy → middleware → controller → MongoDB → response → refresh. The error path, how to watch it, defense questions |
| 2 | [Express and REST](en/02-express-and-rest.md) | [Express ו־REST](he/02-express-and-rest.md) | Middleware and its order, `onError`, why the backend has these folders, REST methods, URLs and status codes, reading your brief's API |

## In one minute · בדקה אחת

```
Browser   form (Zod) → fetch('/api/notes', POST)           + cookie, automatically
Vite      /api/* → localhost:3000
Express   logger → cors → helmet → express.json → notesRouter
Router    requireAuth (who?) → validate (allowed data?) → createNote
Control.  business rules → Note.create(...) → MongoDB
Response  201 JSON  ──or──  throw → onError → 4xx/5xx JSON
Browser   toast → router.invalidate() → loader GETs the list → React re-renders
```

**The golden rule · כלל הזהב:** the browser checks for speed, the server
checks for safety, and the database is the last line of defence.
הדפדפן בודק בשביל מהירות, השרת בודק בשביל אבטחה, ומסד הנתונים הוא קו ההגנה
האחרון.
