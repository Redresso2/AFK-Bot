const mineflayer = require('mineflayer');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const settings = {
    host: 'mc.sentrysmp.eu',
    port: 25565,
    username: process.env.username || 'NotGreen',
    password: process.env.password || 'GreenMan',
    version: '1.20.1'
};

let bot;
let chatLogs = ["-- Bot Starting... --"];
let isBypassing = false;

function createBot() {
    if (bot) return;
    
    bot = mineflayer.createBot({ ...settings, hideErrors: true });

    bot.on('resource_pack', () => bot.acceptResourcePack());

    bot.on('messagestr', (msg) => {
        if (!msg.trim()) return;
        chatLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (chatLogs.length > 50) chatLogs.shift(); // Keep only last 50 lines
        console.log(msg);
    });

    bot.on('end', (reason) => {
        bot = null;
        chatLogs.push(`-- Disconnected: ${reason}. Reconnecting... --`);
        setTimeout(createBot, isBypassing ? 15000 : 5000);
        isBypassing = !isBypassing;
    });
}

// Simple HTML Interface
app.get('/', (req, res) => {
    let logHTML = chatLogs.map(line => `<div>${line}</div>`).join('');
    res.send(`
        <body style="background:#111; color:#0f0; font-family:monospace; padding:20px;">
            <h1>Bot Terminal</h1>
            <div style="border:1px solid #333; height:400px; overflow-y:scroll; padding:10px; background:#000;">
                ${logHTML}
            </div>
            <form action="/send" method="post" style="margin-top:20px;">
                <input name="cmd" style="width:70%; padding:10px;" placeholder="Type /login or /warp here...">
                <button type="submit" style="padding:10px; width:20%;">Send Command</button>
            </form>
            <button onclick="location.reload()" style="margin-top:10px; padding:10px;">Refresh Chat</button>
        </body>
    `);
});

app.post('/send', (req, res) => {
    const cmd = req.body.cmd;
    if (bot && cmd) {
        bot.chat(cmd);
        chatLogs.push(`> SENT: ${cmd}`);
    }
    res.redirect('/'); // Goes back to the main page immediately
});

app.listen(process.env.PORT || 10000, () => {
    console.log("Terminal Online");
    createBot();
});
