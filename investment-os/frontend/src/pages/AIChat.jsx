// AI Chat page (Phase 11): ask "Why is TCS falling?", "Should I continue SIP?"
import { useState } from "react";
import { api } from "../api/client.js";
import { Card } from "../components/ui.jsx";

const SUGGESTIONS = [
  "Why is TCS falling?",
  "Should I continue my SIP?",
  "Why is Infosys PE high?",
  "Why is midcap falling?",
];

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Ask me about a company or the market. I answer using stored data — not financial advice." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await api.chat(q);
      setMessages((m) => [...m, { role: "ai", text: res.answer, disclaimer: res.disclaimer, sources: res.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI Chat</h1>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-brand hover:text-brand">
            {s}
          </button>
        ))}
      </div>

      <Card className="min-h-[300px]">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-brand/20 text-brand" : "bg-slate-800 text-slate-200"}`}>
                {m.text}
                {m.disclaimer && <div className="mt-1 text-xs text-slate-500">{m.disclaimer}</div>}
              </div>
            </div>
          ))}
          {busy && <div className="text-sm text-slate-500">Thinking…</div>}
        </div>
      </Card>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button onClick={() => send()} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}
