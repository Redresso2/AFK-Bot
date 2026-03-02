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
let verified = false; // Prevents movement during verification

function createBot() {
    if (bot) return;

    chatLogs.push(`[SYSTEM] Attempting to connect as ${settings.username}...`);
    bot = mineflayer.createBot(settings);

    // 1. INSTANT RESOURCE PACK ACCEPT
    bot.on('resource_pack', () => {
        bot.acceptResourcePack();
        chatLogs.push("[SYSTEM] Resource Pack Accepted (Verification Step 1).");
    });

    // 2. THE VERIFICATION FREEZE
    // SentrySMP kicks you if you move during the first few seconds.
    bot.once('spawn', () => {
        verified = false;
        chatLogs.push("[SYSTEM] Spawned. Freezing for 12s verification...");
        
        setTimeout(() => {
            verified = true;
            chatLogs.push("[SYSTEM] Verification complete. Controls active.");
        }, 12000);
    });

    // 3. TUTORIAL LOGIC: Only look at players IF verified
    bot.on("move", () => {
        if (!verified) return; 
        
        let friend = bot.nearestEntity();
        if (friend && friend.type === 'player') { 
            bot.lookAt(friend.position.offset(0, friend.height, 0));
        }
    });

    // 4. CHAT LOGS & AUTO-LOGIN
    bot.on("messagestr", (msg) => {
        if (!msg.trim()) return;
        chatLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (chatLogs.length > 50) chatLogs.shift();

        // Auto-detect login prompt
        if (msg.includes("/login") || msg.includes("log in")) {
            const pass = process.env.PASSWORD || "GreenMan";
            setTimeout(() => {
                bot.chat(`/login ${pass}`);
                chatLogs.push(`[SYSTEM] Sent auto-login password.`);
            }, 2000);
        }
    });

    // 5. ANTI-SPAM RECONNECT
    bot.on("end", (reason) => {
        bot = null;
        verified = false;
        // If we get socketClosed, wait longer to avoid an IP ban
        let delay = isBypassing ? 45000 : 10000;
        chatLogs.push(`-- Status: ${reason}. Reconnecting in ${delay/1000}s --`);
        
        setTimeout(createBot, delay);
        isBypassing = !isBypassing;
    });

    bot.on("error", (err) => {
        chatLogs.push(`-- Error: ${err.message} --`);
        bot = null;
        setTimeout(createBot, 60000);
    });
}

// --- SURVIVAL FUNCTIONS ---
async function digDown() {
    if (!verified) return;
    try {
        let block = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        if (block && block.name !== 'air') await bot.dig(block);
    } catch (e) { console.log("Dig Error"); }
}

async function buildUp() {
    if (!verified) return;
    try {
        bot.setControlState("jump", true);
        await bot.waitForTicks(5);
        let block = bot.blockAt(bot.entity.position.offset(0, -1, 0));
        await bot.placeBlock(block, {x:0, y:1, z:0});
        bot.setControlState("jump", false);
    } catch (e) { bot.setControlState("jump", false); }
}

// --- WEB TERMINAL ---
app.get('/', (req, res) => {
    let logHTML = chatLogs.map(line => `<div style="margin-bottom:4px;">${line}</div>`).join('');
    res.send(`
        <body style="background:#000; color:#0f0; font-family:monospace; padding:20px; line-height:1.4;">
            <h2 style="color:#fff; border-bottom:1px solid #333;">AFK BOT TERMINAL</h2>
            <div style="border:1px solid #444; height:450px; overflow-y:scroll; padding:15px; background:#050505; display:flex; flex-direction:column-reverse;">
                <div>${logHTML}</div>
            </div>
            <form action="/send" method="post" style="margin-top:20px;">
                <input name="cmd" autofocus style="width:75%; padding:12px; background:#111; color:#fff; border:1px solid #555;" placeholder="Type /warp or message...">
                <button type="submit" style="padding:12px; width:20%; background:#222; color:#fff; cursor:pointer;">SEND</button>
            </form>
            <div style="margin-top:10px; font-size:12px; color:#666;">
                Status: \${verified ? "VERIFIED" : "WAITING"} | Admin: ${process.env.MAIN_USER}
            </div>
        </body>
    `);
});

app.post('/send', (req, res) => {
    if (bot && req.body.cmd) bot.chat(req.body.cmd);
    res.redirect('/');
});

app.listen(process.env.PORT || 10000, () => {
    console.log("Terminal Ready");
    createBot();
});
