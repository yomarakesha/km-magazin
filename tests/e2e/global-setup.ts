import { cleanupAll } from "./helpers/api";

/** Runs once before the suite: sweep leftovers from a previously crashed run
 *  so tests always start from a clean live database. */
export default async function globalSetup(): Promise<void> {
  const removed = await cleanupAll();
  if (removed.length) console.log(`[e2e] pre-run cleanup: ${removed.join(", ")}`);
}
