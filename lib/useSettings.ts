"use client";

import { useCallback, useEffect, useState } from "react";

export type Settings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Player's name — Rikka treats you as Yuuta, the "Dark Flame Master". */
  userName: string;
  /** Max tokens to generate per reply. */
  maxTokens: number;
};

const STORAGE_KEY = "rikka-settings";

export const DEFAULT_SETTINGS: Settings = {
  // Common local OpenAI-compatible servers:
  //   Ollama:        http://localhost:11434/v1
  //   LM Studio:     http://localhost:1234/v1
  //   vLLM / others: http://localhost:8000/v1
  baseUrl: "http://localhost:20128/v1",
  apiKey: "",
  model: "kr/deepseek-3.2",
  userName: "Yuuta",
  maxTokens: 512,
};

function load(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(load());
    setReady(true);
  }, []);

  const save = useCallback((next: Settings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, []);

  return { settings, save, ready };
}
