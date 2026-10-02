const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

// Dummy Messages

const MESSAGES = {
  INFO: [
    "Dashboard session successfully initialized.",
    "Database connection benchmark: stable (ping 4ms).",
    "Re-indexing background cache elements...",
    "Health check passed for all services.",
    "Scheduled backup completed successfully.",
    "User session authenticated.",
  ],
  WARN: [
    "High system memory allocation detected: 84% usage.",
    "Response time above threshold: 1200ms.",
    "Disk usage at 78% on /var/log.",
    "Deprecated API endpoint `/api/v0/users` was called.",
    "Retrying failed connection to cache node (attempt 2/3).",
  ],
  ERROR: [
    "API network request to `/api/v1/users` failed with status 500.",
    "Database connection timeout after 5000ms.",
    "Unhandled exception in worker thread #3.",
    "Failed to write to disk: no space left on device.",
    "Upstream service unreachable: payments-gateway.",
  ],
};

const LEVELS = Object.keys(MESSAGES);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad = (n, len = 2) => String(n).padStart(len, "0");
 
function timestamp(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function generateLog() {
  const level = pick(LEVELS);

  return {
    level: level,
    message: pick(MESSAGES[level]),
    timestamp: timestamp(),
  };
}

let activeStreams = 0; // counter of open connectons

app.get("/", (req, res) => {
  res.send("LogStream backend is running");
});

app.get("/health",(req,res) => {
    res.json({activeStreams});
});

app.get("/stream", (req, res) => {
  const clientId = (req.query.clientId || "anonymous").toString().slice(0, 50);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering","no");

  res.flushHeaders();

  activeStreams++;
  console.log(`[+] ${clientId} connected (active connections: ${activeStreams})`);

  const interval = setInterval(() => {
    const log = generateLog();

    res.write(`data: ${JSON.stringify(log)}\n\n`);
  }, 500);

  let disconnected = false;

  const onDisconnect = () => {
    if(disconnected) return;

    disconnected = true;

    clearInterval(interval);
    activeStreams--;
    console.log(`[-] ${clientId} disconnected (active connections: ${activeStreams})`);
  };

  req.on("close",onDisconnect);
  res.on("error", onDisconnect);

});

app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
