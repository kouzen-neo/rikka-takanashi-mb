"use client";

import { ChatMsg } from "@/components/MessageBubble";
import { rikka } from "@/lib/character";

export type Session = {
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: number;
};

const STORAGE_KEY = "rikka-sessions";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function newSession(userName: string): Session {
  return {
    id: `s_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    title: "Percakapan baru",
    messages: [
      {
        id: `m_${Date.now()}`,
        role: "assistant",
        content: pick(rikka.firstMessages(userName)),
      },
    ],
    updatedAt: Date.now(),
  };
}

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Derive a short title from the first user message. */
export function titleFrom(messages: ChatMsg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Percakapan baru";
  const t = firstUser.content.trim().replace(/\s+/g, " ");
  return t.length > 28 ? t.slice(0, 28) + "…" : t;
}
