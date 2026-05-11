import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'src/tmp/app.log');

// Ensure the directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [INFO] ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
    
    // 1. Print to console for real-time visibility
    console.log(`[INFO] ${message}`, ...args);
    
    // 2. Append to file for persistence
    try {
      fs.appendFileSync(LOG_FILE, formattedMessage);
    } catch (err) {
      console.error('❌ Failed to write to app.log:', err);
    }
  },

  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    const errorDetail = error instanceof Error ? error.stack : JSON.stringify(error);
    const formattedMessage = `[${timestamp}] [ERROR] ${message} | Detail: ${errorDetail}\n`;
    
    // 1. Print to console
    console.error(`❌ [ERROR] ${message}`, error);
    
    // 2. Capture in Sentry
    if (error instanceof Error) {
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureException(error, {
          extra: { message }
        });
      });
    } else {
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { errorDetail }
        });
      });
    }
    
    // 3. Append to file
    try {
      fs.appendFileSync(LOG_FILE, formattedMessage);
    } catch (err) {
      console.error('❌ Failed to write to app.log:', err);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [WARN] ${message} ${args.length ? JSON.stringify(args) : ''}\n`;
    
    // 1. Print to console
    console.warn(`⚠️ [WARN] ${message}`, ...args);
    
    // 2. Append to file
    try {
      fs.appendFileSync(LOG_FILE, formattedMessage);
    } catch (err) {
      console.error('❌ Failed to write to app.log:', err);
    }
  }
};
