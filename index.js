const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

const settings = {
    host: 'mc.sentrysmp.eu',
    port: 25565,
    username: process.env.username || 'NotGreen',
    password: process.env.password || 'GreenMan',
    owner: process.env.owner || 'Redresso2',
    version: '1.20.1'
};

let bot = null;
let isReady = false;
let isBypassing = false;

function createBot() {
    // 1. Safety check: Don't start if a bot is already trying
    if (bot) return;

    console.log(`[SYSTEM] Starting connection...`);
    
    bot = mineflayer.createBot({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        version: settings.version,
        hideErrors: true 
    });

    bot.once('spawn', () => {
        if (!isBypassing) {
            console.log("[STAGE 1] In Buffer. Waiting for anti-bot kick...");
        } else {
            console.log("[STAGE 2] Bypass Success! Logged in.");
            isReady = true;
            bot.chat('/warp afk');
        }
    });

    bot.on('chat', (username, message) => {
        if (isReady && message.includes('/login')) {
            setTimeout(() => bot.chat(`/login ${settings.password}`), 3000);
        }
    });

    bot.on('end', () => {
        bot = null; // Clear the variable so we can start a new one
        
        if (!isBypassing) {
            isBypassing = true;
            console.log("[SYSTEM] Kicked. Reconnecting for bypass in 5 seconds...");
            setTimeout(createBot, 5000); // 5 seconds is safer than 2 to avoid spam kick
        } else {
            console.log("[SYSTEM] Disconnected. Waiting 30s to reset...");
            isBypassing = false;
            isReady = false;
            setTimeout(createBot, 30000);
        }
    });

    bot.on('error', (err) => {
        console.log("[ERROR]", err.message);
        bot = null;
        isBypassing = false;
        setTimeout(createBot, 30000); // Heavy cooldown on error
    });
}

// Render Port Binding (Crucial to stay live)
app.get('/', (req, res) => res.send(isReady ? "BOT ONLINE" : "BOT BYPASSING..."));
app.listen(process.env.PORT || 10000, () => {
    console.log("Web Dashboard Live");
    createBot(); // Start bot ONLY after web server is up
});
