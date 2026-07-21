import { cleanupAll } from "./helpers/api";

/** Runs once after the suite: remove every E2E- entity and restore edited
 *  content so the live database ends exactly where it started. */
export default async function globalTeardown(): Promise<void> {
  const removed = await cleanupAll();
  if (removed.length) console.log(`[e2e] post-run cleanup: ${removed.join(", ")}`);
}
