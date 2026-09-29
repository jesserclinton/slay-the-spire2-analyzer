import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { router as apiRouter } from "./api.js";
import { getHistoryFolder } from "./settings.js";
import { startWatcher } from "./watcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

// In production, dist/ sits next to the built web assets (see web/vite.config.ts outDir).
const webDist = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);

  const historyFolder = getHistoryFolder();
  if (historyFolder) {
    startWatcher(historyFolder);
  } else {
    console.log("[server] no run-history folder configured yet — set one from the Settings page");
  }
});
