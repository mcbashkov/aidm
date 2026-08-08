"use client";

import { cn } from "@/lib/utils";

export interface ChipGroup {
  title: string;
  items: string[];
}

interface SuggestionChipsProps {
  groups: ChipGroup[];
  onPick?: (text: string) => void;
  className?: string;
}

/**
 * Chip saran pertanyaan berkelompok ("Untukmu", "Gali lebih dalam") di atas
 * kolom input (§13). Baris chip bisa digeser horizontal tanpa scrollbar.
 */
export function SuggestionChips({
  groups,
  onPick,
  className,
}: SuggestionChipsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {groups.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
            {group.title}
          </p>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {group.items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPick?.(item)}
                className="chip whitespace-nowrap"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
