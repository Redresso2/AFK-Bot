const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder');
const autoAuth = require('mineflayer-auto-auth');
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const mcDataLib = require('minecraft-data');

const config = {
  host: process.env.SERVER_HOST || 'mc.sentrysmp.eu',
  port: parseInt(process.env.SERVER_PORT) || 25565,
  version: false,
  authPass: process.env.AUTH_PASS,
  mainUser: process.env.MAIN_USER || 'Redresso2'
};

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static('public'));

let bot, mcdata, defaultMove, expectingWindow = null;
let logs = [];
const MAX_LOGS = 2000;

function logLine(line) {
  const ts = new Date().toLocaleTimeString('en-US', { timeZone: 'UTC' });
  const full = `[${ts} UTC] ${line}`;
  logs.push(full);
  if (logs.length > MAX_LOGS) logs.shift();
  io.emit('log_line', full);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Random Not[word]XX name
const words = ["AFK","Bot","Player","Human","Real","User","Guest","Member","Noob","Pro","Legend","Ghost","Shadow","Ninja","Warrior","Miner","Farmer","Builder","Explorer","Hunter","King","Queen","Boss","Hero","Viking"];
const randomWord = words[Math.floor(Math.random() * words.length)];
const botName = `Not${randomWord}${Math.floor(Math.random() * 90 + 10)}`;
logLine(`🤖 Bot: ${botName}`);

bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: botName,
  version: config.version,
  auth: 'offline'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(autoAuth.plugin);

bot.once('spawn', async () => {
  logLine('✅ Spawned!');
  mcdata = mcDataLib(bot.version);
  defaultMove = new Movements(bot, mcdata);
  bot.pathfinder.setMovements(defaultMove);

  logLine('Approaching NPC...');
  const goal = new GoalNear(bot.entity.position.x + 5, bot.entity.position.y, bot.entity.position.z + 3, 2);
  bot.pathfinder.setGoal(goal);
  await sleep(5500);

  const entities = Object.values(bot.entities).filter(e => e.type === 'mob' || e.type === 'player');
  const nearest = entities.sort((a,b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))[0];

  if (nearest && bot.entity.position.distanceTo(nearest.position) < 6) {
    logLine('Interacting with NPC');
    bot.lookAt(nearest.position.offset(0, nearest.height * 0.85, 0));
    await sleep(900);
    bot.activateEntity(nearest);
    await sleep(2800);
  } else {
    logLine('⚠️ No NPC — check coords');
  }

  logLine(' /warp afk');
  bot.chat('/warp afk');

  setInterval(() => {
    bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI / 2, false);
    if (Math.random() > 0.6) bot.setControlState('jump', true), setTimeout(() => bot.setControlState('jump', false), 300);
  }, 23000);
});

// ... (all other bot.on events, handleWindow, io.on, app.get same as previous code) ...

server.listen(process.env.PORT || 3000, () => logLine('Dashboard ready!'));
