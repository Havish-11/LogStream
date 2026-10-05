# LogStream

A live log dashboard. A Node/Express backend generates simulated server logs and pushes them to the browser over **Server-Sent Events (SSE)**. A React frontend displays them in a terminal-style viewer with filtering and export.

## Features

- Real-time log streaming over SSE (one event every 500 ms)
- Three log levels: `INFO`, `WARN`, `ERROR`
- Start / Stop the stream on demand
- Optional **Client ID** to identify each connection in the server logs
- Filter the view by level without interrupting the connection
- Rolling window: only the latest 100 lines are kept
- Smart auto-scroll: pauses when you scroll up, resumes when you return to the bottom
- Connection status indicator: Stopped / Streaming / Reconnecting
- Save the currently visible logs as `logs.txt`
- `/health` endpoint reporting the number of open streams

## Tech Stack

| Layer    | Tools                                  |
| -------- | -------------------------------------- |
| Backend  | Node.js, Express 5, CORS               |
| Frontend | React 19, Vite 8, React Compiler       |
| Protocol | Server-Sent Events (`EventSource`)     |

## Project Structure

```
LogStream/
├── backend/
│   ├── server.js          # Express server + SSE endpoint
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx        # Dashboard UI and stream logic
    │   ├── App.css
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### 1. Clone and install

```bash
git clone https://github.com/Havish-11/LogStream
cd LogStream

cd backend && npm install
cd ../frontend && npm install
```

### 2. Run the backend

```bash
cd backend
npm run dev      # auto-restart with nodemon
# or
npm start        # plain node
```

The server starts on `http://localhost:5000` (override with the `PORT` environment variable).

### 3. Configure and run the frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env` so it points at the backend:

```
VITE_API_URL=http://localhost:5000
```

Then start the dev server:

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Usage

1. (Optional) Type a **Client ID**. It appears in the backend console so you can tell connections apart. If left blank, `anonymous` is used.
2. Click **Start Stream**. Logs begin appearing and the status changes to *Streaming*.
3. Use the **Show** dropdown to filter by level. The connection stays open while you filter.
4. Scroll up to read older lines. Auto-scroll pauses until you scroll back to the bottom.
5. Click **Save Logs** to download the visible lines as `logs.txt`.
6. Click **Stop Stream** to close the connection.

If the connection drops, the browser retries automatically and the status shows *Reconnecting*.

## API Reference

### `GET /stream?clientId=<id>`

Opens an SSE stream. `clientId` is optional and truncated to 50 characters.

Each event is a JSON payload:

```
data: {"level":"WARN","message":"Disk usage at 78% on /var/log.","timestamp":"10:03:49.080"}
```

| Field       | Description                           |
| ----------- | ------------------------------------- |
| `level`     | `INFO`, `WARN`, or `ERROR`            |
| `message`   | Log text                              |
| `timestamp` | Server local time, `HH:MM:SS.mmm`     |

Quick test from a terminal:

```bash
curl -N "http://localhost:5000/stream?clientId=test"
```

### `GET /health`

Returns the number of currently open streams.

```json
{ "activeStreams": 3 }
```

### `GET /`

Plain-text confirmation that the backend is running.

## How It Works

**Backend.** On each `/stream` request the server sets the SSE headers (`text/event-stream`, `no-cache`, `keep-alive`, and `X-Accel-Buffering: no` to stop proxy buffering), flushes them, then starts a 500 ms interval that writes a randomly generated log event. When the client disconnects, the interval is cleared and the active-stream counter is decremented, so nothing leaks.

**Frontend.** `App.jsx` opens an `EventSource` when you press Start and appends each incoming event to state, capped at the latest 100. Filtering is a derived view of that state, so changing the filter never touches the connection. Closing the component or pressing Stop closes the `EventSource`.

## Deployment

SSE needs long-lived connections, so the backend must run on a host that supports them (Render, Railway, Fly.io). Serverless platforms such as Vercel functions are not suitable for the backend.

**Backend (Render / Railway / Fly.io)**

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- The server reads `process.env.PORT` automatically.

**Frontend (Vercel / Netlify)**

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://<your-backend-url>`

After deploying, open the frontend, start a stream, and confirm logs arrive continuously. Note that free tiers may sleep when idle, so the first connection can be slow.

## Scripts

**Backend**

| Command       | Description                   |
| ------------- | ----------------------------- |
| `npm start`   | Run the server                |
| `npm run dev` | Run with nodemon (auto-reload)|

**Frontend**

| Command           | Description               |
| ----------------- | ------------------------- |
| `npm run dev`     | Start the Vite dev server |
| `npm run build`   | Production build to `dist`|
| `npm run preview` | Preview the production build |
| `npm run lint`    | Run ESLint                |

## Troubleshooting

- **No logs appear / status stuck on Reconnecting:** check that the backend is running and that `VITE_API_URL` matches its address. Restart the frontend after editing `.env`.
- **Logs arrive in bursts in production:** a proxy is buffering the response. Make sure `X-Accel-Buffering: no` is being sent and your host does not compress or buffer event streams.
- **CORS errors:** the backend allows all origins by default. If you restrict it, add your frontend URL to the allowed origins.
