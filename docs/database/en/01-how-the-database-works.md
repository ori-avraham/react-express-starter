# 1. How the database works

[Next: models →](02-models.md) · [עברית](../he/01-how-the-database-works.md)

This page explains the ideas. The next pages show the code.

## MongoDB in one picture

MongoDB stores data as **documents**: objects that look like JSON. Documents of
the same kind live together in a **collection**. A **database** holds
collections.

```
database "express"
├── collection "user"        ← managed by Better Auth
│     { _id: ObjectId("6aef...b87"), name: "Maya Manager", email: "manager@demo.com", role: "manager" }
│     { _id: ObjectId("6aef...b89"), name: "Dan Member",   email: "member@demo.com",  role: "member" }
│
└── collection "notes"       ← yours
      { _id: ObjectId("6aef...d50"), title: "Buy markers", status: "open", owner: ObjectId("6aef...b89"), ... }
```

## If you know SQL tables

Your brief talks about **tables**, **PK** and **FK**. Here is how each idea
maps to MongoDB:

| In the brief (SQL)          | In MongoDB / Mongoose                                      |
| --------------------------- | ---------------------------------------------------------- |
| Database                    | Database                                                   |
| Table (`incidents`)         | Collection (`incidents`), defined by a **model** (`Incident`) |
| Row                         | Document                                                   |
| Column                      | Field                                                      |
| `id` primary key (PK)       | `_id`, created automatically (an **ObjectId**)             |
| Foreign key (`created_by`)  | A field of type `ObjectId` with `ref: "User"`              |
| `NOT NULL`                  | `required: true`                                           |
| `CHECK (status IN (...))`   | `enum: [...]`                                              |
| `DEFAULT 'open'`            | `default: "open"`                                          |
| `UNIQUE`                    | `unique: true` or a unique **index**                       |
| `created_at`                | `{ timestamps: true }` adds `createdAt` and `updatedAt`    |
| `JOIN`                      | `.populate()`                                              |
| `SELECT ... WHERE ...`      | `Model.find({ ... })`                                      |
| `GROUP BY` + `COUNT`        | `Model.aggregate([...])`                                   |

So the tables in your brief become collections, and the columns become fields.
The design work (which tables, which relations) is exactly the same, and you
still draw an ERD for the project book.

## ObjectId: the id of every document

Every document gets an `_id` automatically:

```
ObjectId("6aef8ef455dab10df0c77b89")
```

It is 24 hex characters, unique across the whole database, and you never
create it yourself.

- In the database and in Mongoose it is an **ObjectId**, not a string.
- In JSON sent to the frontend it becomes a **string** in the field `id`
  (see "The `id` field" below).
- `req.user.id` from Better Auth is also a **string**.

This difference causes the most common bug in the project; see
[02-models.md](02-models.md#comparing-ids).

## Mongoose: the layer between Express and MongoDB

MongoDB itself accepts any document with any fields. **Mongoose** adds rules on
top:

- A **schema** says which fields exist, their types, and their rules (required,
  enum, default...).
- A **model** is the object you use to read and write a collection:
  `Note.find()`, `Note.create()`...
- Mongoose **converts** values for you: the string `"2026-12-01"` becomes a
  `Date`, the string `"6aef..."` becomes an `ObjectId`.

```
Controller ──▶ Note.create({ title, owner }) ──▶ Mongoose checks the schema ──▶ MongoDB stores it
```

## The connection: `backend/src/lib/database.js`

```js
export async function connectDatabase() {
  const uri = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/express";

  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}
```

`index.js` calls it **before** the server starts listening, so no request ever
arrives before the database is ready.

The address comes from `DATABASE_URL` in `backend/.env`:

```
mongodb://127.0.0.1:27017/express
└─┬───┘   └───┬───┘ └─┬─┘ └──┬──┘
protocol     host    port  database name
```

- Change the last part to use a different database (e.g. `.../labslot`).
- For MongoDB Atlas (cloud) the address looks like
  `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/labslot`.
- The database and its collections are created **automatically** the first
  time something is saved. There are no `CREATE TABLE` steps.

### Two connections, one database

Better Auth (`lib/auth.js`) opens its own connection with the official
`mongodb` driver, using the same `DATABASE_URL`. Both connections talk to the
**same database**. Better Auth uses its connection for `user`, `session` and
`account`; your models use Mongoose. You don't need to do anything about it.

## The `id` field

`database.js` also contains this:

```js
mongoose.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});
```

Every time a document is sent with `res.json(...)`, it is converted to JSON.
This setting changes that conversion for **every model**:

| Stored in MongoDB                    | Sent to the frontend          |
| ------------------------------------ | ----------------------------- |
| `_id: ObjectId("6aef...")`           | `id: "6aef..."` (a string)    |
| `__v: 0` (Mongoose's version number) | removed                       |

So in React you always write `note.id`, never `note._id`. Populated documents
(like `note.owner`) get the same treatment: `note.owner.id`.

## Two layers of validation

Data is checked twice on its way in:

```
Request body ──▶ Zod (validate middleware) ──▶ Controller ──▶ Mongoose schema ──▶ MongoDB
                 "what the client may send"                    "what may be stored"
```

| | Zod (`schemas/*.schemas.js`) | Mongoose (`models/*.model.js`) |
| --- | --- | --- |
| Checks | The request from the client | The document before saving |
| Example | Title is 3–100 characters | `title` is required |
| Knows about | Only the request | The database (unique indexes, refs) |
| Error | 400 with per-field messages | 400 (validation) or 409 (duplicate) |

Zod catches bad input early with friendly messages. Mongoose is the last line
of defence: even a bug in your controller cannot store a note without a title.

## Summary

- Collections hold documents; your brief's tables become collections.
- Every document has an `_id` (ObjectId); the frontend sees it as `id` (string).
- Mongoose models define fields and rules, and are how you read and write.
- `DATABASE_URL` chooses the database; collections are created automatically.
- Zod checks the request, Mongoose checks what is stored.
