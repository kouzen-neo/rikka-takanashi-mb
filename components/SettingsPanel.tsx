"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Settings, DEFAULT_SETTINGS } from "@/lib/useSettings";
import { cn } from "@/lib/utils";

// Module-level cache so the detected model list survives panel open/close.
let cachedModels: string[] = [];

export function SettingsPanel({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (s: Settings) => void;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [models, setModels] = useState<string[]>(cachedModels);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setModels(cachedModels);
      setDetectError(null);
      setUseCustom(false);
      // Auto-detect on first open so the user never has to click manually.
      if (cachedModels.length === 0) detectModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings]);

  async function detectModels() {
    if (!draft.baseUrl.trim()) {
      setDetectError("Isi Base URL dulu.");
      return;
    }
    setDetecting(true);
    setDetectError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: draft.baseUrl,
          apiKey: draft.apiKey || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Detect failed (${res.status})`);
      if (!json.models?.length) throw new Error("No models returned by server.");
      cachedModels = json.models;
      setModels(json.models);
      // Keep current model if present; else auto-select the first one.
      if (json.models.includes(draft.model)) {
        setUseCustom(false);
      } else {
        setDraft((d) => ({ ...d, model: json.models[0] }));
        setUseCustom(false);
      }
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : "Detect failed.");
    } finally {
      setDetecting(false);
    }
  }

  function handleSave() {
    onSave(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    onClose();
  }

  return (
    <>
      {/* Save confirmation toast */}
      {saved && (
        <div className="fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
          <div className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 shadow-lg backdrop-blur-sm">
            Pengaturan tersimpan ✓
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      {/* Sheet */}
      <aside
        className={cn(
          "fixed z-50 inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Connection Settings</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <p className="mb-5 text-xs text-[var(--muted)]">
          Connect to any OpenAI-compatible server on your machine. API key is
          optional for local servers (Ollama, LM Studio, vLLM…).
        </p>

        <div className="space-y-4 overflow-y-auto">
          <div>
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="http://localhost:20128/v1"
              value={draft.baseUrl}
              onChange={(e) =>
                setDraft({ ...draft, baseUrl: e.target.value })
              }
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Ollama: …:11434/v1 · LM Studio: …:1234/v1 · vLLM: …:8000/v1
            </p>
          </div>

          <div>
            <Label htmlFor="userName">Your name (Dark Flame Master)</Label>
            <Input
              id="userName"
              placeholder="Yuuta"
              value={draft.userName}
              onChange={(e) =>
                setDraft({ ...draft, userName: e.target.value })
              }
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Rikka akan memanggilmu "Dark Flame Master" + namamu.
            </p>
          </div>

          <div>
            <Label htmlFor="model">Model</Label>
            <div className="flex gap-2">
              {useCustom ? (
                <Input
                  id="model"
                  placeholder="kr/deepseek-3.2"
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                />
              ) : (
                <select
                  id="model"
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                >
                  {models.length === 0 && (
                    <option value={draft.model}>— detect dulu —</option>
                  )}
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant="outline"
                onClick={detectModels}
                disabled={detecting}
                title="Detect models from server"
                aria-label="Detect models"
              >
                <RefreshCw className={cn("h-4 w-4", detecting && "animate-spin")} />
              </Button>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[11px] text-[var(--muted)]">
                {models.length > 0
                  ? `${models.length} model terdeteksi.`
                  : "Tekan tombol detect untuk mengambil daftar model."}
              </p>
              <button
                type="button"
                onClick={() => setUseCustom((v) => !v)}
                className="text-[11px] text-[var(--accent)] hover:underline"
              >
                {useCustom ? "pilih dari daftar" : "ketik manual"}
              </button>
            </div>
            {detectError && (
              <p className="mt-1 text-[11px] text-red-400">{detectError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="apiKey">API Key (optional)</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-… (leave empty for local)"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="maxTokens" className="mb-0">Max Tokens (panjang jawaban)</Label>
              <span className="text-xs font-medium text-[var(--foreground)]">
                {draft.maxTokens}
              </span>
            </div>
            <input
              id="maxTokens"
              type="range"
              min={64}
              max={4096}
              step={64}
              value={draft.maxTokens}
              onChange={(e) =>
                setDraft({ ...draft, maxTokens: Number(e.target.value) })
              }
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
              <span>64</span>
              <span>4096</span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex gap-2 pt-5">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setDraft(DEFAULT_SETTINGS)}
          >
            Reset
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Save
          </Button>
        </div>
      </aside>
    </>
  );
}
