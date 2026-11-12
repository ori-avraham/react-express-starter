// Resets the database and fills it with demo data.
//
//   npm run seed
//
// WARNING: this deletes everything in the database first.
import { getLogger } from "@logtape/logtape";
import mongoose from "mongoose";
import { auth } from "./lib/auth.js";
import { connectDatabase } from "./lib/database.js";
import { configureLogging } from "./lib/logging.js";
import { ROLES } from "./lib/roles.js";
import { Note } from "./models/note.model.js";

// Add every model you create here so its indexes are rebuilt after the reset.
const appModels = [Note];

const DEMO_PASSWORD = "password1234";

const demoUsers = [
  { name: "Maya Manager", email: "manager@demo.com", role: ROLES.MANAGER },
  { name: "Dan Member", email: "member@demo.com", role: ROLES.MEMBER },
  { name: "Noa Member", email: "member2@demo.com", role: ROLES.MEMBER },
];

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production database.");
  process.exit(1);
}

await configureLogging();
const logger = getLogger(["app", "seed"]);

await connectDatabase();
await mongoose.connection.dropDatabase();
await Promise.all(appModels.map((model) => model.syncIndexes()));
logger.info("Database cleared");

// Users must be created through Better Auth so passwords are hashed properly.
const users = {};
for (const demoUser of demoUsers) {
  const { user } = await auth.api.createUser({
    body: { ...demoUser, password: DEMO_PASSWORD },
  });
  users[demoUser.email] = user;
}
logger.info("Created {count} users", { count: demoUsers.length });

const manager = users["manager@demo.com"];
const dan = users["member@demo.com"];
const noa = users["member2@demo.com"];

await Note.create([
  {
    title: "Welcome to the notes example",
    content: "Copy this resource when you build your own.",
    owner: dan.id,
  },
  {
    title: "Buy whiteboard markers",
    content: "Room 204 is out of markers.",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    owner: dan.id,
  },
  { title: "Submit project proposal", status: "done", owner: dan.id },
  { title: "Prepare the demo scenario", owner: noa.id },
  { title: "Old meeting notes", status: "archived", owner: noa.id },
  { title: "Review student projects", owner: manager.id },
]);
logger.info("Created notes");

console.log("\nDemo users (password for all: %s)", DEMO_PASSWORD);
console.table(demoUsers.map(({ email, role }) => ({ email, role })));

// Better Auth keeps its own connection open, so exit explicitly.
await mongoose.disconnect();
process.exit(0);
