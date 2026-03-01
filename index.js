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

let bot;
let isReady = false;
let joinCount = 0; // Track if it's the first join or the second

function startBot() {
    isReady = false;
    console.log(`Connecting... (Attempt #${joinCount + 1})`);

    bot = mineflayer.createBot({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        version: settings.version
    });

    bot.once('spawn', () => {
        console.log("Joined server. Waiting for bot detection...");
        
        // If it's the first time joining, we just sit there and wait to be kicked
        if (joinCount === 0) {
            setTimeout(() => {
                console.log("10 seconds passed. Expecting kick soon...");
            }, 10000);
        } else {
            // If joinCount > 0, we are in!
            isReady = true;
            console.log("Bypassed detection! Proceeding to AFK...");
            bot.chat('/warp afk');
        }
    });

    bot.on('chat', (username, message) => {
        if (isReady && message.includes('/login')) {
            setTimeout(() => bot.chat(`/login ${settings.password}`), 2000);
        }
    });

    bot.on('end', (reason) => {
        isReady = false;
        
        // BOT DETECTION LOGIC:
        // If we were kicked, reconnect FAST (within 5 seconds) to satisfy the 15s limit
        if (joinCount === 0) {
            joinCount = 1; 
            console.log("Kicked by anti-bot. Reconnecting immediately to bypass...");
            setTimeout(startBot, 2000); // 2 second delay is safe but fast
        } else {
            // If we get kicked AFTER bypassing, wait longer before trying again
            console.log("Disconnected from main server. Retrying in 20s...");
            joinCount = 0; 
            setTimeout(startBot, 20000);
        }
    });

    bot.on('error', (err) => {
        console.log("Error:", err.message);
        // On error, reset and try again
        joinCount = 0;
        setTimeout(startBot, 5000);
    });
}

// Keep Render happy
app.get('/', (req, res) => res.send("Bot Status: " + (isReady ? "AFK" : "Bypassing...")));
app.listen(process.env.PORT || 10000);

startBot();
