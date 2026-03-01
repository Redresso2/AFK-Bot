const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const express = require('express');
const config = require('./config.json');

const app = express();
const port = 3000;
let bot;

function createBot() {
    bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version
    });

    bot.loadPlugin(pathfinder);

    // --- Login Logic ---
    bot.on('chat', (username, message) => {
        if (message.includes('/login')) {
            bot.chat(`/login ${config.password}`);
        }
    });

    // --- Spawn & Anti-AFK ---
    bot.on('spawn', () => {
        console.log("Bot joined! Moving to AFK zone...");
        bot.chat('/warp afk');
        
        // Minor movements to prevent server kicks
        setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }, 60000);
    });

    // --- GUI / Menu Handling (Trade & Pay) ---
    bot.on('windowOpen', async (window) => {
        const title = window.title ? JSON.parse(window.title).text : "";
        console.log(`Opened Menu: ${title}`);

        const items = window.containerItems();

        // 1. Find AFK Key in Trade
        const afkKey = items.find(i => i.displayName.toLowerCase().includes('afk key'));
        if (afkKey) {
            console.log("Adding AFK Key to trade...");
            await bot.clickWindow(afkKey.slot, 0, 0);
        }

        // 2. Find Confirmation (End Stone / Green Block)
        const confirmBtn = items.find(i => 
            i.displayName.toLowerCase().includes('confirm') || 
            i.name.includes('end_stone') || 
            i.name.includes('terracotta')
        );

        if (confirmBtn) {
            const delay = title.toLowerCase().includes('trade') ? 10500 : 1000;
            console.log(`Clicking confirm in ${delay/1000}s...`);
            setTimeout(() => bot.clickWindow(confirmBtn.slot, 0, 0), delay);
        }
    });

    bot.on('end', () => setTimeout(createBot, 10000));
}

// --- Web Dashboard API ---
app.get('/', (res) => res.send('Bot is running. Use /pay, /trade, or /afk endpoints.'));

app.get('/pay', (req, res) => {
    bot.chat(`/pay ${config.owner} 1000`);
    res.send('Payment sent! Check GUI to confirm.');
});

app.get('/trade', (req, res) => {
    bot.chat('/spawn');
    setTimeout(() => {
        bot.chat(`/trade ${config.owner}`);
        res.send('At spawn, trade started.');
    }, 3000);
});

app.get('/afk', (req, res) => {
    bot.chat('/warp afk');
    res.send('Returning to AFK area.');
});

app.listen(port, () => console.log(`Control bot at http://localhost:${port}`));
createBot();
