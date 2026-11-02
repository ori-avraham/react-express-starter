import {
  configure,
  getConsoleSink,
  jsonLinesFormatter,
} from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";

let configured = false;

export async function configureLogging() {
  if (configured) return;
  configured = true;

  const isProd = process.env.NODE_ENV === "production";

  await configure({
    sinks: {
      console: isProd
        ? getConsoleSink({ formatter: jsonLinesFormatter })
        : getConsoleSink({ formatter: prettyFormatter }),
    },
    loggers: [
      {
        category: ["app"],
        sinks: ["console"],
        lowestLevel: isProd ? "info" : "debug",
      },
      {
        category: ["express"],
        sinks: ["console"],
        lowestLevel: "info",
      },
      {
        category: ["logtape", "meta"],
        sinks: ["console"],
        lowestLevel: "warning",
      },
    ],
  });
}
