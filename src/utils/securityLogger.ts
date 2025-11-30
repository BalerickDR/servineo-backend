// src/utils/securityLogger.ts
import fs from 'fs';
import path from 'path';

const logFilePath = path.join(__dirname, '../logs/securityEvents.log');

export function logSecurityEvent(eventData: { event: string, providerId: string, message: string }) {
  const { event, providerId, message } = eventData;
  const logMessage = `[${new Date().toISOString()}] Event: ${event} | Provider ID: ${providerId} | Message: ${message}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Error writing to security log", err);
    }
  });
}
