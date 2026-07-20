"use client";

import { X } from "lucide-react";
import { Character } from "@/lib/character";

export function ProfileDialog({
  character,
  open,
  onClose,
}: {
  character: Character;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const b = character.bio;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-[var(--muted)] hover:bg-white/10 hover:text-[var(--foreground)]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Identity */}
        <div className="flex flex-col items-center text-center">
          <img
            src={character.avatar}
            alt={character.name}
            className="h-24 w-24 rounded-full object-cover ring-2"
            style={{ // @ts-expect-error css var
              "--tw-ring-color": character.accent }}
          />
          <h2 className="mt-3 text-xl font-semibold">{character.name}</h2>
          <p className="text-sm" style={{ color: character.accent }}>
            {character.title}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{b.age}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)] italic">{b.anime}</p>
        </div>

        <div className="mt-6 space-y-5">
          <Section title="Penampilan" items={b.appearance} />
          <Section title="Chuunibyou" items={b.chuunibyou} />
          <Section title="Kepribadian" items={b.personality} />
          <Section title="Catchphrase" items={b.catchphrases} last />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  last,
}: {
  title: string;
  items: string[];
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "border-b border-[var(--border)] pb-5"}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-[var(--foreground)]">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
