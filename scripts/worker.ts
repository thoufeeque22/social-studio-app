import * as Sentry from "@sentry/nextjs";
import { startPublishingWorker } from "../src/lib/worker/worker";

// Initialize Sentry for the standalone worker process
Sentry.init({
  dsn: "https://9800045c43fe08784a055fb53ceeb7f9@o4511273668182016.ingest.de.sentry.io/4511273675456592",
  tracesSampleRate: 1.0,
});

/**
 * STANDALONE WORKER SCRIPT
 * This script runs the background publishing worker independently from the Next.js server.
 * Run with: npx tsx scripts/worker.ts
 */

async function main() {
  console.log("🚀 Starting standalone worker process...");
  
  try {
    await startPublishingWorker();
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down worker...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('🛑 Shutting down worker...');
      process.exit(0);
    });

  } catch (error) {
    console.error("💥 Worker failed to start:", error);
    process.exit(1);
  }
}

main();
