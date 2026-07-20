"use client";

import { useState } from "react";
import { Pencil, RefreshCw, GitBranch, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Character } from "@/lib/character";
import { Button } from "./ui/button";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function MessageBubble({
  msg,
  character,
  streaming,
  thinking,
  canEdit,
  canRetry,
  canBranch,
  onEditResend,
  onRetry,
  onBranch,
}: {
  msg: ChatMsg;
  character: Character;
  streaming?: boolean;
  thinking?: string;
  canEdit?: boolean;
  canRetry?: boolean;
  canBranch?: boolean;
  onEditResend?: (text: string) => void;
  onRetry?: () => void;
  onBranch?: () => void;
}) {
  const isUser = msg.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);

  function saveEdit() {
    const t = draft.trim();
    if (t && t !== msg.content) onEditResend?.(t);
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "group flex w-full gap-2 px-3 py-2 sm:px-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <img
          src={character.avatar}
          alt={character.name}
          className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover ring-2"
          style={{
            // @ts-expect-error css var
            "--tw-ring-color": character.accent,
          }}
        />
      )}

      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "min-w-[3rem] max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[82%]",
            isUser
              ? "rounded-br-sm bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "rounded-bl-sm bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]"
          )}
        >
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              autoFocus
              className="w-full max-w-md resize-y bg-transparent text-[15px] text-[var(--foreground)] outline-none"
            />
          ) : (
            <>
              {msg.content}
              {streaming && (
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[var(--accent)]" />
              )}
              {thinking && (
                <span className="inline-flex items-center gap-1.5 italic text-[var(--muted)]">
                  {thinking}
                  <span className="inline-flex gap-0.5">
                    <Dots />
                  </span>
                </span>
              )}
            </>
          )}
        </div>

        {/* Edit mode controls */}
        {editing && (
          <div className="mt-1 flex gap-1">
            <Button variant="primary" onClick={saveEdit} className="h-8 px-3 py-1">
              <Check className="h-4 w-4" /> Resend
            </Button>
            <Button variant="ghost" onClick={() => { setDraft(msg.content); setEditing(false); }} className="h-8 px-3 py-1">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Hover actions */}
        {!editing && !streaming && (
          <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {canEdit && (
              <button
                onClick={() => { setDraft(msg.content); setEditing(true); }}
                className="rounded-md p-1 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
                title="Edit & resend"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {canRetry && (
              <button
                onClick={onRetry}
                className="rounded-md p-1 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
                title="Retry"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            {canBranch && (
              <button
                onClick={onBranch}
                className="rounded-md p-1 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
                title="Branch from here"
              >
                <GitBranch className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <>
      <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-current" />
    </>
  );
}
