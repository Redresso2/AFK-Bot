require('dotenv').config();
const mineflayer = require("mineflayer");
const express = require("express");
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// --- CONFIGURATION ---
const settings = {
    host: process.env.SERVER_HOST || "mc.sentrysmp.eu",
    port: parseInt(process.env.SERVER_PORT) || 25565,
    username: process.env.USERNAME || "NotGreenMan",
    version: "1.20.1"
};

let bot;
let chatLogs = ["-- Terminal Starting --"];
let isBypassing = false;

function createBot() {
    if (bot) return;

    bot = mineflayer.createBot(settings);

    // FIX: Accept SentrySMP Resource Pack
    bot.on('resource_pack', () => {
        bot.acceptResourcePack();
        chatLogs.push("[SYSTEM] Resource Pack Accepted.");
    });

    // Capture Chat for Web UI
    bot.on("messagestr", (msg) => {
        if (!msg.trim()) return;
        chatLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (chatLogs.length > 50) chatLogs.shift();
    });

    // Handle Dig/Build Commands via Chat (From your original code)
    bot.on("chat", (username, text) => {
        if (username === bot.username) return;
        if (text === "down") digDown();
        else if (text === "gold") digGold();
        else if (text === "up") buildUp();
    });

    // Anti-Bot Bypass Logic
    bot.on("end", (reason) => {
        bot = null;
        let delay = isBypassing ? 30000 : 8000;
        chatLogs.push(`-- Disconnected (${reason}). Rejoining in ${delay/1000}s... --`);
        setTimeout(createBot, delay);
        isBypassing = !isBypassing;
    });

    bot.on("error", (err) => {
        chatLogs.push(`-- Error: ${err.message} --`);
        setTimeout(createBot, 60000);
    });
}

// --- YOUR ORIGINAL FUNCTIONS (MODIFIED FOR ASYNC) ---
async function digDown() {
    try {
        let blockPosition = bot.entity.position.offset(0, -1, 0);
        let block = bot.blockAt(blockPosition);
        if (block && block.name !== 'air') {
            await bot.dig(block);
            bot.chat("Dug the block below me.");
        }
    } catch (e) { console.log(e); }
}

function digGold() {
    let block = bot.findBlock({
        matching: (b) => b.name === "gold_block",
        maxDistance: 5,
    });
    if (block) bot.dig(block, false);
    else bot.chat("I can't reach any gold ;-;");
}

async function buildUp() {
    try {
        bot.setControlState("jump", true);
        await bot.waitForTicks(5);
        let sourcePosition = bot.entity.position.offset(0, -1, 0);
        let sourceBlock = bot.blockAt(sourcePosition);
        await bot.placeBlock(sourceBlock, {x:0, y:1, z:0});
        bot.setControlState("jump", false);
    } catch (e) { bot.setControlState("jump", false); }
}

// --- WEB INTERFACE (REQUIRED FOR RENDER) ---
app.get('/', (req, res) => {
    let logHTML = chatLogs.map(line => `<div>${line}</div>`).join('');
    res.send(`
        <body style="background:#000; color:#0f0; font-family:monospace; padding:20px;">
            <h1>Sentry AFK Bot Terminal</h1>
            <div style="border:1px solid #333; height:400px; overflow-y:scroll; padding:10px; display:flex; flex-direction:column-reverse;">
                <div>${logHTML}</div>
            </div>
            <form action="/send" method="post" style="margin-top:20px;">
                <input name="cmd" style="width:70%; padding:10px;" placeholder="Type /login [pass] or command...">
                <button type="submit" style="padding:10px; width:20%;">Send</button>
            </form>
            <p>Admin: ${process.env.MAIN_USER}</p>
        </body>
    `);
});

app.post('/send', (req, res) => {
    if (bot && req.body.cmd) bot.chat(req.body.cmd);
    res.redirect('/');
});

app.listen(process.env.PORT || 10000, () => {
    console.log("Web Terminal Live");
    createBot();
});
