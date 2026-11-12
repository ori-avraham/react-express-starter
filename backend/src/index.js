import { getLogger } from "@logtape/logtape";
import app from "./app.js";
import { connectDatabase } from "./lib/database.js";
import { configureLogging } from "./lib/logging.js";

await configureLogging();
await connectDatabase();

const port = Number(process.env.PORT) || 3000;

const logger = getLogger(["app"]);

app.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});
