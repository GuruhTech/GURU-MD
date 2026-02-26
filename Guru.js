import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import readline from 'readline';
import { BOT_NAME, OWNER_NAME, PREFIX, SESSION_FOLDER } from './config.js';
import { tryLoadBase64Session } from './lib/sessionHandler.js';
import { loadAllPlugins, commands } from './lib/pluginLoader.js';

const logger = pino({ level: 'silent' });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let sock;
let reconnectAttempts = 0;

async function connect() {
  const loadedBase64 = await tryLoadBase64Session();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: [BOT_NAME, 'Chrome', '130.0.0.0'],
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (upd) => {
    const { connection, lastDisconnect, qr } = upd;

    if (qr && !loadedBase64) {
      console.log('\n[GURU] Scan this QR:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log(`\n╔════ BOT GURU ONLINE ════╗\n║     by Guru ${new Date().toLocaleString()}     ║\n╚════════════════════════╝`);
      await loadAllPlugins();
      await sock.sendMessage(sock.user.id, { text: `BOT GURU by ${OWNER_NAME} is live ${new Date().toLocaleString()}` });
      reconnectAttempts = 0;
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[BOT GURU] Closed (${statusCode}) → reconnect? ${shouldReconnect}`);

      if (shouldReconnect) {
        reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** reconnectAttempts, 60000);
        console.log(`Reconnecting in ${delay/1000}s ...`);
        setTimeout(connect, delay);
      }
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages: [m] }) => {
    if (!m.message) return;

    const text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
    if (!text.startsWith(PREFIX)) return;

    const cmdPart = text.slice(PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = text.slice(PREFIX.length + cmdPart.length).trim();

    const cmdObj = commands.get(cmdPart);
    if (cmdObj) {
      try {
        await cmdObj.run(sock, m, args);
      } catch (err) {
        console.error(`Cmd ${cmdPart} error:`, err);
        await sock.sendMessage(m.key.remoteJid, { text: `Error in ${cmdPart}: ${err.message}` }, { quoted: m });
      }
    }
  });

  // Pairing fallback if no session
  if (!state.creds.registered && !loadedBase64) {
    const number = await new Promise(r => rl.question('[GURU] Enter phone (e.g. 2547xxxxxxxx): ', r));
    try {
      const code = await sock.requestPairingCode(number.replace(/\D/g, ''));
      console.log(`\n[GURU] Pairing code: ${code}\nEnter in WhatsApp → Linked Devices → Link with phone number`);
    } catch (e) {
      console.error('[GURU] Pairing failed:', e);
    }
  }
}

connect().catch(err => {
  console.error('[BOT GURU] Fatal:', err);
  process.exit(1);
});
