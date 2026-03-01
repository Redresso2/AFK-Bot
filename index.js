const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

// --- CONFIGURATION ---
// Using Environment Variables for Render
const settings = {
    host: process.env.host || 'mc.sentrysmp.eu',
    port: parseInt(process.env.port) || 25565,
    username: process.env.username || 'NotGreen',
    password: process.env.password || 'GreenMan',
    owner: process.env.owner || 'Redresso2',
    version: '1.20.1' // Stable Mineflayer version
};

let bot;
let isReady = false;

// --- WEB SERVER (Render stays happy) ---
app.use(express.static('public'));

app.get('/status', (req, res) => {
    res.send(isReady ? `Bot Online: ${settings.username}` : "Bot Offline/Reconnecting...");
});

app.get('/pay', (req, res) => {
    if (isReady && bot.chat) {
        bot.chat(`/pay ${settings.owner} 1000`);
        return res.send("Payment sent!");
    }
    res.send("Bot not ready yet.");
});

app.get('/trade', (req, res) => {
    if (isReady && bot.chat) {
        bot.chat('/spawn');
        setTimeout(() => { if(isReady) bot.chat(`/trade ${settings.owner}`); }, 3000);
        return res.send("Moving to spawn for trade...");
    }
    res.send("Bot not ready yet.");
});

app.get('/afk', (req, res) => {
    if (isReady && bot.chat) {
        bot.chat('/warp afk');
        return res.send("Returning to AFK...");
    }
    res.send("Bot not ready yet.");
});

// Render's Port binding
const webPort = process.env.PORT || 10000;
app.listen(webPort, () => console.log(`Dashboard live on port ${webPort}`));

// --- BOT LOGIC ---
function startBot() {
    isReady = false;
    console.log("Attempting to connect to Minecraft server...");

    bot = mineflayer.createBot({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        version: settings.version,
        checkTimeoutInterval: 60000 // Increased to prevent ECONNRESET
    });

    bot.on('spawn', () => {
        isReady = true;
        console.log("Bot in game.");
        // Anti-AFK Jump every 45s
        setInterval(() => {
            if (isReady) {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }
        }, 45000);
    });

    bot.on('chat', (username, message) => {
        if (message.includes('/login')) {
            setTimeout(() => bot.chat(`/login ${settings.password}`), 2000);
        }
    });

    bot.on('windowOpen', async (window) => {
        const title = window.title ? JSON.parse(window.title).text : "";
        const items = window.containerItems();

        // Find and click the confirmation block
        const confirm = items.find(i => i.displayName.includes('Confirm') || i.name.includes('end_stone') || i.name.includes('terracotta'));
        if (confirm) {
            const delay = title.toLowerCase().includes('trade') ? 10500 : 1000;
            setTimeout(() => { if (bot.window) bot.clickWindow(confirm.slot, 0, 0); }, delay);
        }

        // Find and click AFK keys in trade
        const key = items.find(i => i.displayName.toLowerCase().includes('afk key'));
        if (key) bot.clickWindow(key.slot, 0, 0);
    });

    // Auto-reconnect logic
    bot.on('end', () => {
        isReady = false;
        console.log("Disconnected. Restarting in 15 seconds...");
        setTimeout(startBot, 15000);
    });

    bot.on('error', (err) => {
        console.log("Mineflayer Error:", err.message);
        if (err.code === 'ECONNRESET') startBot(); 
    });
}

startBot();
