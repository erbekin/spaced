// Create the shutdown function
export async function shutdown(server, signal) {
  console.log(`🔴 ${signal} received. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async () => {
    console.log('🔚 HTTP server closed.');

    try {
      // 2. Clean up external resources (e.g., database, Redis)
      // await db.disconnect();
      // console.log('Resource cleanup complete.');
      process.exit(0);
    } catch (err) {
      console.error('🔴 Error during resource cleanup:', err);
      process.exit(1);
    }
  });

  // 3. Force shutdown if draining takes too long
  setTimeout(() => {
    console.error('🔴 Shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000); // 10-second timeout
}
