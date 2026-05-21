"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, ChatMessageRole } from "@/app/types/chat";

interface AgentChatProps {
  agentId: string;
  agentName: string;
  accentColor: string;
  connected: boolean;
}

const ROLE_STYLES: Record<ChatMessageRole, { color: string; prefix: string }> = {
  user: { color: "var(--ce-green-bright)", prefix: "❯ " },
  assistant: { color: "var(--ce-text-primary)", prefix: "" },
  tool_use: { color: "var(--ce-status-communicating)", prefix: "⚡ " },
  tool_result: { color: "var(--ce-text-secondary)", prefix: "  " },
  result: { color: "var(--ce-green-primary)", prefix: "✓ " },
  error: { color: "var(--ce-status-error)", prefix: "✗ " },
};

export function AgentChat({ agentId, agentName, accentColor, connected }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [agentId]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      agentId,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
          const lines = eventBlock.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (eventType === "message" && eventData) {
            try {
              const msg = JSON.parse(eventData) as ChatMessage;
              setMessages((prev) => [...prev, msg]);
            } catch {
              /* ignore malformed */
            }
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            agentId,
            role: "error",
            content: err instanceof Error ? err.message : "Connection failed",
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [agentId, input, streaming]);

  function handleCancel() {
    abortRef.current?.abort();
    fetch(`/api/agents/${agentId}/chat`, { method: "DELETE" }).catch(() => {});
  }

  function handleClear() {
    if (!streaming) setMessages([]);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(127,214,66,0.1)]">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="text-[10px] font-mono text-[var(--ce-text-secondary)] uppercase tracking-wider">
            Terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !streaming && (
            <button
              onClick={handleClear}
              className="text-[9px] text-[var(--ce-text-secondary)] hover:text-[var(--ce-text-primary)] transition-colors"
            >
              Clear
            </button>
          )}
          {streaming && (
            <span className="text-[9px] text-[var(--ce-status-working)] animate-pulse">
              streaming
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 font-mono text-xs leading-relaxed space-y-0.5 min-h-0"
        style={{ background: "var(--ce-black)" }}
      >
        {messages.length === 0 && (
          <div className="text-[var(--ce-text-secondary)] text-[10px] py-6 text-center select-none">
            Chat with <span style={{ color: accentColor }}>{agentName}</span>
            <br />
            <span className="text-[9px] opacity-60">
              This agent runs Claude Code with filesystem access
            </span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatLine key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        {streaming && (
          <div className="text-[var(--ce-status-working)] animate-pulse pt-1">
            ● thinking...
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-[rgba(127,214,66,0.1)] px-3 py-2" style={{ background: "var(--ce-gray-darkest)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[var(--ce-green-primary)] font-mono text-xs select-none">❯</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              !connected
                ? "Not connected"
                : streaming
                  ? "Waiting..."
                  : "Send a message..."
            }
            disabled={!connected || streaming}
            className="flex-1 bg-transparent text-[var(--ce-green-primary)] placeholder:text-[var(--ce-text-secondary)] outline-none font-mono text-xs disabled:opacity-40"
          />
          {streaming ? (
            <button
              onClick={handleCancel}
              className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ce-status-error)] text-white font-semibold hover:brightness-110 transition-all"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || !connected}
              className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ce-green-primary)] text-[var(--ce-black)] font-semibold hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatLine({ message }: { message: ChatMessage }) {
  const style = ROLE_STYLES[message.role] ?? ROLE_STYLES.assistant;

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      className="min-w-0"
    >
      {message.role === "tool_use" && (
        <div style={{ color: style.color }}>
          <span>{style.prefix}</span>
          <span className="font-semibold">{message.toolName}</span>
          {message.toolInput && (
            <ToolInputBlock input={message.toolInput} />
          )}
        </div>
      )}
      {message.role === "tool_result" && (
        <ToolResultBlock content={message.content} color={style.color} prefix={style.prefix} />
      )}
      {message.role !== "tool_use" && message.role !== "tool_result" && (
        <div style={{ color: style.color }}>
          <span>{style.prefix}</span>
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        </div>
      )}
    </motion.div>
  );
}

function ToolInputBlock({ input }: { input: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = input.length > 200;
  const display = expanded ? input : input.slice(0, 200);

  return (
    <pre className="ml-4 mt-0.5 text-[10px] text-[var(--ce-text-secondary)] whitespace-pre-wrap break-words max-h-32 overflow-y-auto scrollbar-thin">
      {display}
      {truncated && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[var(--ce-status-communicating)] ml-1 hover:underline"
        >
          ...show more
        </button>
      )}
    </pre>
  );
}

function ToolResultBlock({ content, color, prefix }: { content: string; color: string; prefix: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = content.length > 400;
  const display = expanded ? content : content.slice(0, 400);

  return (
    <pre
      className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto scrollbar-thin"
      style={{ color }}
    >
      {prefix}{display}
      {truncated && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[var(--ce-status-communicating)] ml-1 hover:underline"
        >
          ...show more
        </button>
      )}
    </pre>
  );
}
