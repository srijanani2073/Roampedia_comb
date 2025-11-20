// Chatbot.jsx
import React, { useState, useRef, useEffect } from "react";
import "./Chatbot.css";

export default function Chatbot({ apiUrl = "http://localhost:5050/api/chat" }) {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "🌍 Hi! I’m Roampedia Assistant. Ask me about any country!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { sender: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }
      const data = await res.json();
      const botText = data.response || "⚠️ No reply from server.";
      setMessages((m) => [...m, { sender: "bot", text: botText }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((m) => [...m, { sender: "bot", text: "⚠️ Error: Could not reach the chatbot backend." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => setMessages([{ sender: "bot", text: "🌍 Hi! I’m Roampedia Assistant. Ask me about any country!" }]);

  return (
    <div className="rp-chatbot">
      <div className="rp-chat-header">🌍 Roampedia Assistant</div>

      <div className="rp-chat-body">
        {messages.map((m, i) => (
          <div key={i} className={`rp-msg ${m.sender}`}>
            <div className="rp-msg-bubble" dangerouslySetInnerHTML={{ __html: escapeAndFormat(m.text) }} />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="rp-chat-controls">
        <textarea
          className="rp-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask e.g. 'What is the capital of India?'"
        />
        <button className="rp-send" onClick={send} disabled={loading}>
          {loading ? "…" : "Send"}
        </button>
        <button className="rp-clear" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}

function escapeAndFormat(text) {
  if (!text) return "";
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // convert newlines to <br>
  return escaped.replace(/\n/g, "<br/>");
}