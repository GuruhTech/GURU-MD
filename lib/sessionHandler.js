import fs from 'fs/promises';
import path from 'path';
import { SESSION_ID, SESSION_FOLDER } from '../config.js';

export async function tryLoadBase64Session() {
  if (!SESSION_ID?.startsWith('Guru')) return false;

  try {
    const base64 = SESSION_ID.slice(4).trim();
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    const creds = JSON.parse(jsonStr);

    await fs.mkdir(SESSION_FOLDER, { recursive: true });
    await fs.writeFile(path.join(SESSION_FOLDER, 'creds.json'), JSON.stringify(creds, null, 2));

    console.log(`[BOT GURU] Loaded Guru-base64 session`);
    return true;
  } catch (err) {
    console.log(`[BOT GURU] Invalid Guru-session → ${err.message}`);
    return false;
  }
}
