<!--
  README template for your project.
  When your project is ready, replace the root README.md with this file and
  fill in every <...>. Delete sections that don't apply and these comments.
-->

# <Project name>

<One or two sentences: what problem does the system solve, and for whom?>

**Students:** <Name 1> (<what you built>), <Name 2> (<what you built>)

## Screenshots

<!-- Add 2-4 screenshots: put the images in docs/screenshots/ -->
![Dashboard](docs/screenshots/dashboard.png)

## Roles

| Role       | What they can do                    |
| ---------- | ----------------------------------- |
| <role 1>   | <e.g. create incidents, see own>    |
| <role 2>   | <e.g. see all, close incidents>     |

## Business rules

<!-- Copy the rules from your brief. Each one must work and be tested. -->

1. <e.g. A new incident opens with status "open".>
2. <...>
3. <...>
4. <...>

## Getting started

Requirements: Node.js 22+, MongoDB.

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173.

## Demo users

Password for all users: `password1234`

| Email               | Role     |
| ------------------- | -------- |
| <email>             | <role>   |
| <email>             | <role>   |

## Demo scenario

<!-- The exact steps from your brief's "demo scenario" section. -->

1. Sign in as <role> (<email>).
2. <...>
3. <...>

## Database

<!-- ERD image, or a table per collection. -->

| Collection  | Fields                                         | Relations              |
| ----------- | ---------------------------------------------- | ---------------------- |
| user        | name, email, role (managed by Better Auth)     |                        |
| <name>      | <fields>                                       | <field> → <collection> |

## API

| Method | Path                    | Who        | Description              |
| ------ | ----------------------- | ---------- | ------------------------ |
| GET    | /api/<resource>         | <roles>    | <what it returns>        |
| POST   | /api/<resource>         | <roles>    | <what it creates>        |

## Tests

See [docs/tests.md](docs/tests.md).

## Challenges and what we learned

<What was hard, how you solved it, what you would do differently.>
