"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Settings, Send, Plus, Menu, MessageSquare, X, Square } from "lucide-react";
import { Button } from "./ui/button";
import { MessageBubble, ChatMsg } from "./MessageBubble";
import { SettingsPanel } from "./SettingsPanel";
import { useSettings } from "@/lib/useSettings";
import { rikka } from "@/lib/character";
import { Session, loadSessions, saveSessions, newSession, titleFrom } from "@/lib/history";
import { ProfileDialog } from "./ProfileDialog";
import { cn } from "@/lib/utils";

let idCounter = 0;
const nextId = () => `m${Date.now()}_${idCounter++}`;

const THINKING_PHRASES = [
  "Rikka memanggil kekuatan Dark Flame…",
  "Tyrant's Eye sedang mengamati…",
  "Mengaktifkan Jaō Shingan…",
  "Merapal mantra tersembunyi…",
  "Berhubungan dengan Ethereal Horizon…",
  "Menyusun kontrak okult…",
  "Wicked Lord Shingan merespons…",
  "Mou~ tunggu sebentar…",
];

export function Chat() {
  const { settings, save, ready } = useSettings();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions once settings are ready; seed one if empty.
  useEffect(() => {
    if (!ready) return;
    const loaded = loadSessions();
    if (loaded.length === 0) {
      const s = newSession(settings.userName);
      setSessions([s]);
      setActiveId(s.id);
      saveSessions([s]);
    } else {
      setSessions(loaded);
      setActiveId(loaded[0].id);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Cycle the "Rikka is thinking" phrase every second while waiting.
  useEffect(() => {
    if (!thinkingText) return;
    const tick = () => {
      const i = Math.floor(Date.now() / 1000) % THINKING_PHRASES.length;
      setThinkingText(THINKING_PHRASES[i]);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [thinkingText]);

  function writeSession(id: string, nextMessages: ChatMsg[], setTitle = true) {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? {
              ...s,
              messages: nextMessages,
              updatedAt: Date.now(),
              title: setTitle ? titleFrom(nextMessages) : s.title,
            }
          : s
      );
      saveSessions(next);
      return next;
    });
  }

  function startNewChat() {
    const s = newSession(settings.userName);
    setSessions((prev) => {
      const next = [s, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(s.id);
    setError(null);
    setHistoryOpen(false);
  }

  function switchSession(id: string) {
    setActiveId(id);
    setError(null);
    setHistoryOpen(false);
  }

  function deleteSession(id: string) {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      if (id === activeId) {
        if (next.length > 0) setActiveId(next[0].id);
        else {
          const s = newSession(settings.userName);
          saveSessions([s]);
          setActiveId(s.id);
          return [s];
        }
      }
      return next;
    });
  }

  async function generate(history: ChatMsg[], assistantId: string) {
    if (!settings.baseUrl || !settings.model) {
      setError("Open Settings and set Base URL + Model first.");
      setSettingsOpen(true);
      return;
    }
    // Lock the session we're generating into. Reads/writes below always target
    // this id, so switching or creating chats mid-stream can't misdirect output.
    const targetId = activeId;
    if (!targetId) {
      setError("No active chat. Start a new chat first.");
      return;
    }
    setError(null);
    setBusy(true);
    setThinkingText(THINKING_PHRASES[0]);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";

    const payload = {
      messages: [
        { role: "system" as const, content: rikka.systemPrompt(settings.userName) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey || undefined,
      model: settings.model,
      temperature: 0.9,
      max_tokens: settings.maxTokens,
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta: string = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              if (thinkingText) setThinkingText(null);
              acc += delta;
              writeSession(
                targetId,
                history.concat({ id: assistantId, role: "assistant", content: acc }),
                false
              );
            }
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
      writeSession(
        targetId,
        history.concat({ id: assistantId, role: "assistant", content: acc })
      );
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        // Stopped by user — keep what we have.
        writeSession(
          targetId,
          history.concat({ id: assistantId, role: "assistant", content: acc })
        );
        return;
      }
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errMsg);
      writeSession(
        targetId,
        history.filter((m) => !(m.id === assistantId && m.content === ""))
      );
    } finally {
      setBusy(false);
      setThinkingText(null);
      abortRef.current = null;
    }
  }

  function send() {
    const text = input.trim();
    if (!text || busy || !activeId) return;

    setError(null);
    const userMsg: ChatMsg = { id: nextId(), role: "user", content: text };
    const assistantId = nextId();
    // Add an empty assistant placeholder so the "thinking" indicator shows
    // immediately while waiting for the first token.
    const history = [...messages, userMsg];
    writeSession(
      activeId,
      [...history, { id: assistantId, role: "assistant", content: "" }]
    );
    setInput("");
    generate(history, assistantId);
  }

  /** Resend an edited user message: truncate everything after it, then regenerate. */
  function resendFrom(msgId: string, newText: string) {
    if (busy || !activeId) return;
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    const history = messages
      .slice(0, idx)
      .map((m) => (m.id === msgId ? { ...m, content: newText } : m));
    const assistantId = nextId();
    writeSession(activeId, [...history, { id: assistantId, role: "assistant", content: "" }]);
    generate(history, assistantId);
  }

  /** Retry the last assistant reply. */
  function retryLast() {
    if (busy || !activeId) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx < 0) return;
    const cut = messages.length - 1 - lastUserIdx;
    const history = messages.slice(0, cut);
    const assistantId = nextId();
    writeSession(activeId, [...history, { id: assistantId, role: "assistant", content: "" }]);
    generate(history, assistantId);
  }

  /** Undo the user's last sent message (and its reply). */
  function undoLast() {
    if (busy || !activeId) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx < 0) return;
    const cut = messages.length - 1 - lastUserIdx;
    writeSession(activeId, messages.slice(0, cut));
    setError(null);
  }

  /** Create a branch: a new session starting from the selected message. */
  function branchFrom(msgId: string) {
    if (!activeId) return;
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    const branched: Session = {
      id: `s_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      title: titleFrom(messages.slice(0, idx + 1)),
      messages: messages.slice(0, idx + 1).map((m) => ({ ...m })),
      updatedAt: Date.now(),
    };
    setSessions((prev) => {
      const next = [branched, ...prev];
      saveSessions(next);
      return next;
    });
    setActiveId(branched.id);
    setHistoryOpen(false);
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ignore Enter while an IME composition is active (prevents premature send
    // and stray newlines on mobile keyboards).
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  const lastIdx = messages.length - 1;

  return (
    <div className="flex h-full w-full">
      {/* History sidebar: slide-in drawer (mobile + desktop) */}
      <HistorySidebar
        open={historyOpen}
        sessions={sessions}
        activeId={activeId}
        onClose={() => setHistoryOpen(false)}
        onSelect={switchSession}
        onDelete={deleteSession}
        onNew={startNewChat}
      />

      {/* Chat column — full width */}
      <div className="flex h-full w-full flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3 sm:px-4">
          <Button variant="ghost" onClick={() => setHistoryOpen(true)} aria-label="History" title="History">
            <Menu className="h-5 w-5" />
          </Button>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label="Lihat profil Rikka"
          >
            <img
              src={rikka.avatar}
              alt={rikka.name}
              className="h-11 w-11 rounded-full object-cover ring-2"
              style={{ // @ts-expect-error css var
                "--tw-ring-color": rikka.accent }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-semibold">{rikka.name}</h1>
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" title="online" />
              </div>
              <p className="truncate text-xs text-[var(--muted)]">
                {rikka.title} · {rikka.tagline}
              </p>
            </div>
          </button>
          <Button variant="ghost" onClick={undoLast} disabled={busy || messages.filter((m) => m.role === "user").length === 0} aria-label="Undo last message" title="Undo last message">
            <X className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={startNewChat} aria-label="New chat" title="New chat">
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              msg={m}
              character={rikka}
              streaming={busy && i === lastIdx && m.role === "assistant"}
              thinking={
                busy && i === lastIdx && m.role === "assistant"
                  ? thinkingText ?? undefined
                  : undefined
              }
              canEdit={!busy && m.role === "user"}
              canRetry={!busy && m.role === "assistant" && i === lastIdx}
              canBranch={!busy && i < messages.length - 1}
              onEditResend={(t) => resendFrom(m.id, t)}
              onRetry={retryLast}
              onBranch={() => branchFrom(m.id)}
            />
          ))}
          {error && (
            <div className="mx-3 mt-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 sm:mx-4">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 focus-within:border-[var(--accent)]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              enterKeyHint="send"
              placeholder="Talk to Rikka… (Enter to send, Shift+Enter for newline)"
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
            <Button
              onClick={busy ? stopGenerating : send}
              disabled={busy ? false : !input.trim()}
              variant={busy ? "outline" : "primary"}
              aria-label={busy ? "Stop generating" : "Send message"}
            >
              {busy ? <Square className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-center text-[11px] text-[var(--muted)]">
            Local OpenAI-compatible · streaming · API key optional
          </p>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={save}
      />

      <ProfileDialog
        character={rikka}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </div>
  );
}

function HistorySidebar({
  open,
  sessions,
  activeId,
  onClose,
  onSelect,
  onDelete,
  onNew,
}: {
  open: boolean;
  sessions: Session[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed z-50 inset-y-0 left-0 flex h-full w-full max-w-[240px] flex-col border-r border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--muted)]">Riwayat</h2>
          <div className="flex gap-1">
            <Button variant="ghost" onClick={onNew} aria-label="New chat" title="New chat">
              <Plus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-[var(--muted)]">
              Belum ada percakapan.
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                s.id === activeId
                  ? "bg-white/10 text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-white/5"
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
                className="shrink-0 text-[var(--muted)] opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
