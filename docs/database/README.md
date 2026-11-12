# Database guide · מדריך מסד הנתונים

Everything about MongoDB and Mongoose in this project: how data is stored,
how to design your collections, and how to read and write them.
Read the pages in order.

כל מה שצריך לדעת על MongoDB ו־Mongoose בפרויקט: איך המידע נשמר, איך מתכננים
את האוספים, ואיך קוראים וכותבים נתונים. קראו את הדפים לפי הסדר.

| # | English | עברית | What you'll learn |
| - | ------- | ----- | ----------------- |
| 1 | [How the database works](en/01-how-the-database-works.md) | [איך עובד מסד הנתונים](he/01-how-the-database-works.md) | Collections and documents, SQL → MongoDB, ObjectId, Mongoose, the connection, `id` vs `_id`, Zod vs Mongoose |
| 2 | [Models](en/02-models.md) | [מודלים](he/02-models.md) | Schemas and field types, turning your brief's tables into models, relations, indexes, comparing ids |
| 3 | [Queries](en/03-queries.md) | [שאילתות](he/03-queries.md) | Create, find, filters, populate, update, delete, count, aggregate, `lean()` |
| 4 | [Seed, tools and FAQ](en/04-seed-tools-and-faq.md) | [נתוני דמו, כלים ושאלות נפוצות](he/04-seed-tools-and-faq.md) | `npm run seed`, MongoDB Compass, drawing the ERD, common errors |

## In one minute · בדקה אחת

```
Brief table "reservations"  → model Reservation (models/reservation.model.js) → collection "reservations"
id (PK)                     → _id, automatic (ObjectId) → sent to React as "id" (string)
user_id (FK)                → user: { type: ObjectId, ref: "User" } → .populate("user", "name")
Read                        → await Reservation.find({ status: "active" }).sort({ startTime: 1 })
Write                       → await Reservation.create({...}) · load + save() · findOneAndUpdate(...)
Reset demo data             → npm run seed
```

**The golden rule · כלל הזהב:** `req.user.id` is a string, `doc.owner` is an
ObjectId. Compare with `.toString()`.
`req.user.id` הוא מחרוזת ו־`doc.owner` הוא ObjectId. משווים עם `.toString()`.
