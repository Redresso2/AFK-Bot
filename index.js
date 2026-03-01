const mineflayer = require('mineflayer');
const express = require('express');
const path = require('path');
const config = require('./config.json');

const app = express();
const port = process.env.PORT || 3000; // Render provides the port
let bot;

app.use(express.static('public'));

function createBot() {
    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version
    });

    // Login logic
    bot.on('chat', (username, message) => {
        if (message.includes('/login')) bot.chat(`/login ${config.password}`);
    });

    bot.on('spawn', () => {
        console.log("Bot online.");
        bot.chat('/warp afk');
    });

    // GUI Logic for Pay/Trade
    bot.on('windowOpen', async (window) => {
        const title = window.title ? JSON.parse(window.title).text : "";
        const items = window.containerItems();

        // Find AFK Key
        const afkKey = items.find(i => i.displayName.toLowerCase().includes('afk key'));
        if (afkKey) await bot.clickWindow(afkKey.slot, 0, 0);

        // Find Confirmation
        const confirmBtn = items.find(i => 
            i.displayName.toLowerCase().includes('confirm') || 
            i.name.includes('end_stone') || 
            i.name.includes('terracotta')
        );

        if (confirmBtn) {
            const delay = title.toLowerCase().includes('trade') ? 10500 : 1000;
            setTimeout(() => bot.clickWindow(confirmBtn.slot, 0, 0), delay);
        }
    });

    bot.on('end', () => setTimeout(createBot, 10000));
}

// API Routes
app.get('/pay', (req, res) => {
    bot.chat(`/pay ${config.owner} 1000`);
    res.send('Pay command sent');
});

app.get('/trade', (req, res) => {
    bot.chat('/spawn');
    setTimeout(() => bot.chat(`/trade ${config.owner}`), 3000);
    res.send('Heading to spawn for trade');
});

app.get('/afk', (req, res) => {
    bot.chat('/warp afk');
    res.send('Returning to AFK');
});

app.listen(port, () => console.log(`Dashboard live on port ${port}`));
createBot();
