const mineflayer = require('mineflayer');

const SERVER = 'play.jartexnetwork.com';
const PORT = 25565;

const TARGET_SERVER = 'prison';

const accounts = [
  {
    username: 'mayankbaliwal',
    label: 'mayank'
  },
  {
    username: 'aayush_king0die',
    label: 'aayush'
  }
];

const RECONNECT_DELAY = 5000;

// Hold messages briefly so identical messages from both
// accounts can be combined into one line.
const pendingMessages = new Map();

// Noisy status-bar / spam lines to hide from the chat log.
// - Rankup/prestige progress bar, e.g. "0.0%: █████"
// - Prestige prompt, e.g. "You can /PRESTIGE"
const SPAM_PATTERNS = [
  /^\d+(\.\d+)?%:\s*[█░▓▒■]+$/,
  /^you can \/prestige$/i
];

function isSpamMessage(text) {
  return SPAM_PATTERNS.some((pattern) => pattern.test(text));
}

function logMessage(username, text) {
  const cleanText = text.trim();

  if (!cleanText) return;
  if (isSpamMessage(cleanText)) return;

  if (pendingMessages.has(cleanText)) {
    const entry = pendingMessages.get(cleanText);

    if (!entry.users.includes(username)) {
      entry.users.push(username);
    }

    clearTimeout(entry.timer);

    const receiver =
      entry.users.length >= 2 ? 'both' : entry.users[0];

    console.log(`[RECEIVED BY ${receiver}] ${cleanText}`);

    pendingMessages.delete(cleanText);
    return;
  }

  const timer = setTimeout(() => {
    const entry = pendingMessages.get(cleanText);

    if (!entry) return;

    console.log(
      `[RECEIVED BY ${entry.users[0]}] ${cleanText}`
    );

    pendingMessages.delete(cleanText);
  }, 150);

  pendingMessages.set(cleanText, {
    users: [username],
    timer
  });
}

function startBot(account) {
  console.log(`[STARTING] ${account.label}`);

  let bot;
  let reconnecting = false;

  function connect() {
    reconnecting = false;

    console.log(
      `[CONNECTING] ${account.label} → ${SERVER}`
    );

    bot = mineflayer.createBot({
      host: SERVER,
      port: PORT,
      username: account.username,
      auth: 'offline',
      version: '1.8.9'
    });

    bot.on('connect', () => {
      console.log(`[CONNECTED] ${account.label}`);
    });

    bot.on('login', () => {
      console.log(`[LOGIN PACKET] ${account.label}`);
    });

    bot.on('spawn', () => {
      console.log(`[SPAWNED] ${account.label}`);
    });

    bot.on('message', (message) => {
      const text = message.toString();

      // Show incoming server messages.
      logMessage(account.label, text);

      // Authentication required:
      // immediately disconnect this account.
      if (/authentication required/i.test(text)) {
        console.log(
          `[AUTH REQUIRED] ${account.label} → forcing disconnect`
        );

        bot.end('Authentication required');
        return;
      }

      // Jartex login request.
      if (/please login with \/login/i.test(text)) {
        console.log(
          `[LOGIN REQUEST] ${account.label} → /login piyush`
        );

        bot.chat('/login piyush');
        return;
      }

      // Unclaimed rewards → join target server.
      if (/unclaimed/i.test(text)) {
        console.log(
          `[UNCLAIMED] ${account.label} → /server ${TARGET_SERVER}`
        );

        bot.chat(`/server ${TARGET_SERVER}`);
        return;
      }
    });

    bot.on('kicked', (reason) => {
      console.log(
        `[KICKED] ${account.label}: ${reason}`
      );
    });

    bot.on('error', (error) => {
      console.log(
        `[ERROR] ${account.label}: ${error.message}`
      );
    });

    bot.on('end', (reason) => {
      console.log(
        `[DISCONNECTED] ${account.label}: ${reason || 'socket closed'}`
      );

      scheduleReconnect();
    });
  }

  function scheduleReconnect() {
    if (reconnecting) return;

    reconnecting = true;

    console.log(
      `[RECONNECT] ${account.label} → retrying in ${RECONNECT_DELAY / 1000}s`
    );

    setTimeout(() => {
      console.log(
        `[RECONNECT] ${account.label} → attempting...`
      );

      connect();
    }, RECONNECT_DELAY);
  }

  connect();
}

// Start both accounts independently.
for (const account of accounts) {
  startBot(account);
}
