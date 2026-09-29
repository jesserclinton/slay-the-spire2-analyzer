import chokidar, { type FSWatcher } from "chokidar";
import { ingestHistoryFolder, ingestRunFile } from "./ingest.js";

let currentWatcher: FSWatcher | undefined;

export function startWatcher(historyDir: string): void {
  stopWatcher();

  const backfill = ingestHistoryFolder(historyDir);
  console.log(`[watcher] backfilled ${backfill.ingested} run(s) from ${historyDir}`);

  currentWatcher = chokidar.watch(historyDir, {
    ignored: /\.run\.backup$/,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  currentWatcher.on("add", (filePath) => {
    if (!filePath.endsWith(".run")) return;
    const result = ingestRunFile(filePath);
    if (!result.skipped) console.log(`[watcher] ingested new run ${result.runId}`);
  });

  currentWatcher.on("change", (filePath) => {
    if (!filePath.endsWith(".run")) return;
    const result = ingestRunFile(filePath);
    if (!result.skipped) console.log(`[watcher] re-ingested updated run ${result.runId}`);
  });
}

export function stopWatcher(): void {
  currentWatcher?.close();
  currentWatcher = undefined;
}
