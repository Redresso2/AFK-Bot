const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const settings = {
    host: 'mc.sentrysmp.eu',
    port: 25565,
    username: process.env.username || 'NotGreen',
    password: process.env.password || 'GreenMan',
    version: '1.20.1'
};

let bot;
let isBypassing = false;

function createBot() {
    if (bot) return;

    bot = mineflayer.createBot({ ...settings, hideErrors: true });

    bot.on('resource_pack', () => bot.acceptResourcePack());

    bot.on('messagestr', (msg) => {
        console.log(msg);
        io.emit('chat', msg); // Sends game chat to your browser
    });

    bot.on('end', () => {
        bot = null;
        const delay = isBypassing ? 30000 : 8000;
        if (!isBypassing) isBypassing = true;
        else isBypassing = false;
        setTimeout(createBot, delay);
    });
}

// Web Interface Logic
app.get('/', (req, res) => {
    res.send(`
        <body style="background:#222; color:#eee; font-family:sans-serif; padding:20px;">
            <h2>Bot Control Center</h2>
            <div id="logs" style="height:300px; overflow-y:scroll; background:#000; padding:10px; border:1px solid #444;"></div>
            <input id="cmd" style="width:80%; padding:10px; margin-top:10px;" placeholder="Type command here...">
            <button onclick="send()" style="padding:10px;">Send</button>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const logs = document.getElementById('logs');
                socket.on('chat', (msg) => {
                    logs.innerHTML += '<div>' + msg + '</div>';
                    logs.scrollTop = logs.scrollHeight;
                });
                function send() {
                    const val = document.getElementById('cmd').value;
                    socket.emit('command', val);
                    document.getElementById('cmd').value = '';
                }
            </script>
        </body>
    `);
});

io.on('connection', (socket) => {
    socket.on('command', (cmd) => {
        if (bot) bot.chat(cmd); // This lets YOU type from the website!
    });
});

server.listen(process.env.PORT || 10000, () => {
    console.log("Control Center Live!");
    createBot();
});
