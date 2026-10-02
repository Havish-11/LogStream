import { useEffect, useState, useRef } from "react";

import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_LINES = 100; //rolling window

const FILTERS = [
  { value: "ALL", label: "All levels" },
  { value: "INFO", label: "Info" },
  { value: "WARN", label: "Warn" },
  { value: "ERROR", label: "Error" },
];

const STATUS_TEXT = {
  idle: "Stopped",
  live: "Streaming",
  reconnecting: "Reconnecting",
};

export default function App() {
  const [clientId, setClientId] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const esRef = useRef(null);

  const nxtId = useRef(0);
  const termRef = useRef(null);
  const stickToBottom = useRef(true);

  // This filter only changes what is shown; the connection is never touched.

  const visible =
    filter === "ALL" ? logs : logs.filter((l) => l.level === filter);

  const stop = () => {
    esRef.current?.close();
    esRef.current = null;
    setStreaming(false);
    setStatus("idle");
  };

  const start = () => {
    if (esRef.current) return;

    const id = clientId.trim() || "anonymous";
    const es = new EventSource(
      `${API}/stream?clientId=${encodeURIComponent(id)}`,
    );

    es.onopen = () => setStatus("live");
    es.onmessage = (e) => {
      const log = JSON.parse(e.data);
      setLogs((prev) =>
        [...prev, { ...log, id: nxtId.current++ }].slice(-MAX_LINES),
      );
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) stop();
      else setStatus("reconnecting");
    };

    esRef.current = es;
    setLogs([]);
    setStreaming(true);
  };


  // Close the connection once the component unmounts
  useEffect(() => ()=> esRef.current?.close(),[]);

  useEffect(() =>{
    const el = termRef.current;
    if(el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  },[visible]);

  const onTerminalScroll = () =>{
    const el = termRef.current;

    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight<24;
  };

  const save = () => {
    const text = visible.map((l) => `${l.timestamp} [${l.level}] ${l.message}`).join("\n")+"\n";
    const url = URL.createObjectURL(new Blob([text],{
      type: "text/plain"
    }));
    const a = document.createElement("a");
    a.href=url;
    a.download="logs.txt";
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <main className="app">
      <header className="top">
        <h1>LogStream</h1>
        <span className={`status status-${status}`} role="status">
          <span className="dot" aria-hidden="true"/>
          {STATUS_TEXT[status]}
        </span>
      </header>


      <section className="controls" aria-label="Stream controls">
        <div className="field">
          <label>Client ID</label>
          <input
            id="client-id"
            type="text"
            value={clientId}
            onChange={(e)=> setClientId(e.target.value)}
            placeholder="Enter Client ID"
            maxLength={50}
            disabled={streaming}
            autoComplete="off"
          />
        </div>

        <div className="buttons">
          <button className="btn primary" onClick={start} disabled={streaming}>
            Start Stream
          </button>
          <button className="btn" onClick={stop} disabled={!streaming}>
            Stop Stream
          </button>
        </div>

        <div className="field">
          <label>Show</label>
          <select id="level-filter" value={filter} onChange={(e)=>setFilter(e.target.value)}>
            {FILTERS.map((f)=>(
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        
        <button className="btn ghost" onClick={save} disabled={visible.length ===0}>
          Save Logs
        </button>
      </section>

      <div className="terminal" ref={termRef} onScroll={onTerminalScroll} tabIndex={0} aria-label="Log output">
        {visible.length === 0 ? (
          <p className="empty">
            {logs.length > 0 ? "No lines match this level yet." : "Start the stream to see logs here."}
          </p>
        ) : (
          visible.map((l) => (
            <div key={l.id} className={`line lvl-${l.level}`}>
              <span className="time">{l.timestamp}</span>
              <span className="tag">[{l.level}]</span>
              <span className="msg">{l.message}</span>
            </div>
          ))
        )}
      </div>

      <footer className="foot">
        {visible.length} {visible.length===1 ? "line": "lines"}
        {filter !== "ALL" && ` of ${logs.length}`}
        {logs.length >= MAX_LINES && `: keeping the latest ${MAX_LINES}`}
      </footer>
    </main>
  )
}
