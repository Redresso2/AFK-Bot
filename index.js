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
    if (bot) {
        try { bot.end(); } catch (e) {}
        bot = null;
    }

    console.log(`--- Connecting... (Attempt ${isBypassing ? '#2' : '#1'}) ---`);

    bot = mineflayer.createBot({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        version: settings.version,
        hideErrors: true
    });

    // --- NEW: RESOURCE PACK HANDLER ---
    bot.on('resource_pack', () => {
        bot.acceptResourcePack();
    });

    bot.once('spawn', () => {
        if (!isBypassing) {
            console.log("Joined Buffer. Waiting for anti-bot kick...");
        } else {
            console.log("Bypass Success!");
            isReady = true;
            setTimeout(() => { if(isReady) bot.chat('/warp afk'); }, 3000);
        }
    });

    bot.on('chat', (username, message) => {
        if (isReady && message.includes('/login')) {
            setTimeout(() => bot.chat(`/login ${settings.password}`), 2000);
        }
    });

    bot.on('end', () => {
        bot = null;
        isReady = false;
        if (!isBypassing) {
            isBypassing = true;
            console.log("Kicked. Reconnecting for bypass in 4 seconds...");
            setTimeout(createBot, 4000);
        } else {
            console.log("Disconnected. Resetting in 20s...");
            isBypassing = false;
            setTimeout(createBot, 20000);
        }
    });

    bot.on('error', (err) => {
        console.log("Error:", err.message);
        bot = null;
        isBypassing = false;
        setTimeout(createBot, 15000);
    });
}

app.get('/', (req, res) => res.send(isReady ? "BOT ONLINE" : "BYPASSING/LOADING PACK"));
app.listen(process.env.PORT || 10000, () => {
    console.log("Web Server Live");
    createBot();
});
