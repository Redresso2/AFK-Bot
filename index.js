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
let joinCount = 0; 

function startBot() {
    // If a bot instance already exists, kill it properly before starting a new one
    if (bot) {
        bot.removeAllListeners();
        bot.quit();
        bot = null;
    }

    isReady = false;
    console.log(`--- Connecting... (Attempt #${joinCount + 1}) ---`);

    bot = mineflayer.createBot({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        version: settings.version,
        hideErrors: true // Keeps logs clean from standard disconnect errors
    });

    bot.once('spawn', () => {
        if (joinCount === 0) {
            console.log("Joined Buffer. Waiting for expected kick...");
            // We do nothing here, just wait for the anti-bot to kick us
        } else {
            isReady = true;
            console.log("Bypass Success! Moving to AFK...");
            bot.chat('/warp afk');
        }
    });

    bot.on('chat', (username, message) => {
        if (isReady && message.includes('/login')) {
            setTimeout(() => bot.chat(`/login ${settings.password}`), 2000);
        }
    });

    // Handle Disconnects
    bot.on('end', (reason) => {
        isReady = false;
        
        if (joinCount === 0) {
            joinCount = 1; 
            console.log("Kicked from Buffer. Reconnecting in 2 seconds...");
            setTimeout(startBot, 2500); // Clean 2.5s delay
        } else {
            console.log("Disconnected from main. Cooling down for 20s...");
            joinCount = 0; 
            setTimeout(startBot, 20000);
        }
    });

    bot.on('error', (err) => {
        console.log("Connection Error: ", err.message);
        joinCount = 0; 
        setTimeout(startBot, 10000);
    });
}

// Render Health Check
app.get('/', (req, res) => res.send(isReady ? "Online" : "Bypassing..."));
app.listen(process.env.PORT || 10000);

startBot();
