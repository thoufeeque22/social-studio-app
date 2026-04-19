export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPublishingWorker } = await import('@/lib/worker');
    startPublishingWorker();
  }
}
