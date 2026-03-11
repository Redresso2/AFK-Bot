require('dotenv').config();
const mineflayer = require("mineflayer");
const express = require("express");
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const config = {
    host: process.env.SERVER_HOST || "mc.sentrysmp.eu",
    port: 25565,
    username: process.env.USERNAME || "NotGreenMan",
    password: process.env.PASSWORD || "GreenMan",
    version: "1.20.1"
};

let bot;
let chatLogs = ["-- Terminal Booting --"];
let isBypassing = false;
let verified = false;

function createBot() {
    if (bot) return;
    bot = mineflayer.createBot(config);

    // 1. Instant Resource Pack Accept
    bot.on('resource_pack', () => {
        bot.acceptResourcePack();
        log("[SYSTEM] Resource Pack Accepted.");
    });

    // 2. The Spawn/Verification Handling
    bot.once('spawn', () => {
        verified = false;
        log("[SYSTEM] Spawned. Waiting 12s for verification check...");
        
        setTimeout(() => {
            verified = true;
            log("[SYSTEM] Verification window passed. Starting Auth sequence.");
            handleAuth();
        }, 12000);
    });

    // 3. Logic for Auth & GUI Navigation
    function handleAuth() {
        // Detect if we need to Register or Login based on chat history
        // (Handled in the messagestr listener below)
    }

    bot.on("messagestr", (msg) => {
        if (!msg.trim()) return;
        log(`[CHAT] ${msg}`);

        // Step: Register/Login
        if (msg.includes("/register")) {
            bot.chat(`/register ${config.password} ${config.password}`);
            startGuiSequence();
        } else if (msg.includes("/login")) {
            bot.chat(`/login ${config.password}`);
            startGuiSequence();
        }
    });

    function startGuiSequence() {
        log("[STEP] Waiting 3s after login to switch to 5th slot...");
        setTimeout(() => {
            // Step: Select 5th slot (index 4)
            bot.setQuickBarSlot(4); 
            log("[STEP] 5th Slot Selected. Right-clicking...");
            
            // Step: Right Click
            bot.activateItem(); 

            // Step: Wait for Window to open
            bot.once('windowOpen', (window) => {
                log("[STEP] GUI Opened. Clicking 14th slot...");
                // 14th slot is index 13
                bot.clickWindow(13, 0, 0); 
                
                log("[STEP] Clicked. Waiting 20s for server transition...");
                setTimeout(() => {
                    log("[STEP] Running /warp afk...");
                    bot.chat("/warp afk");
                    startAntiAfk();
                }, 20000);
            });
        }, 3000);
    }

    // 4. Anti-AFK (Jumping & Looking)
    function startAntiAfk() {
        setInterval(() => {
            if (!bot) return;
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
            bot.look(Math.random() * Math.PI * 2, 0);
        }, 45000);
    }

    // 5. Reconnect Logic
    bot.on("end", (reason) => {
        bot = null;
        let delay = isBypassing ? 30000 : 8000;
        log(`-- Disconnected (${reason}). Rejoining in ${delay/1000}s --`);
        setTimeout(createBot, delay);
        isBypassing = !isBypassing;
    });

    bot.on("error", (err) => log(`[ERROR] ${err.message}`));
}

function log(text) {
    const time = new Date().toLocaleTimeString();
    chatLogs.push(`[${time}] ${text}`);
    if (chatLogs.length > 50) chatLogs.shift();
    console.log(text);
}

// --- WEB INTERFACE ---
app.get('/', (req, res) => {
    let logHTML = chatLogs.map(line => `<div>${line}</div>`).join('');
    res.send(`
        <body style="background:#000; color:#0f0; font-family:monospace; padding:20px;">
            <h1>SentrySMP AFK Bot</h1>
            <div style="border:1px solid #333; height:450px; overflow-y:scroll; padding:10px; display:flex; flex-direction:column-reverse;">
                <div>${logHTML}</div>
            </div>
            <form action="/send" method="post" style="margin-top:20px;">
                <input name="cmd" style="width:70%; padding:10px;" placeholder="Manual command...">
                <button type="submit" style="padding:10px;">Send</button>
            </form>
        </body>
    `);
});

app.post('/send', (req, res) => {
    if (bot && req.body.cmd) bot.chat(req.body.cmd);
    res.redirect('/');
});

app.listen(process.env.PORT || 10000, () => {
    console.log("Terminal Online");
    createBot();
});
