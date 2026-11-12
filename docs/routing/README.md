# Routing and data loading guide · מדריך ניתוב וטעינת נתונים

How pages, links and URLs work in the frontend (TanStack Router), and how
pages load and refresh their data.

איך עובדים דפים, קישורים וכתובות ב־frontend (TanStack Router), ואיך דפים טוענים
ומרעננים את הנתונים שלהם.

| # | English | עברית | What you'll learn |
| - | ------- | ----- | ----------------- |
| 1 | [Routes and navigation](en/01-routes-and-navigation.md) | [נתיבים וניווט](he/01-routes-and-navigation.md) | Files → URLs, layouts and `<Outlet />`, `<Link>`, `navigate()`, `$params`, search params, `beforeLoad`, the order of everything |
| 2 | [Loading data](en/02-loading-data.md) | [טעינת נתונים](he/02-loading-data.md) | Loaders, loading and error screens, `loaderDeps`, several requests, `router.invalidate()`, POST/PATCH/DELETE, where data should live |

## In one minute · בדקה אחת

```
src/routes/dashboard/issues/$issueId.jsx → URL /dashboard/issues/:issueId
dashboard/route.jsx + <Outlet />         → layout around every /dashboard page
beforeLoad                               → checks first (signed in? right role?) → redirect
loader                                   → fetch('/api/...') before the page shows
Route.useLoaderData()                    → the data, already loaded
router.invalidate()                      → reload after a change
```

**The golden rule · כלל הזהב:** read data in the **loader**, change it in an
**event handler**, then **`router.invalidate()`**.
קוראים נתונים ב־**loader**, משנים אותם ב־**event handler**, ואז
**`router.invalidate()`**.
