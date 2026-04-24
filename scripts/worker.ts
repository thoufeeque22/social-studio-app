import { startPublishingWorker } from "../src/lib/worker/worker";

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
