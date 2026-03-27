"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/useAppStore";
import type { NatureType } from "@/types";

const OPTIONS: { value: NatureType; label: string; emoji: string }[] = [
  { value: "mountain", label: "산", emoji: "⛰️" },
  { value: "forest", label: "숲/공원", emoji: "🌲" },
  { value: "water", label: "호수/하천", emoji: "💧" },
];

export function NatureTypeFilter() {
  const natureTypes = useAppStore((s) => s.filter.natureTypes);
  const setFilter = useAppStore((s) => s.setFilter);

  function toggle(type: NatureType) {
    const next = natureTypes.includes(type)
      ? natureTypes.filter((t) => t !== type)
      : [...natureTypes, type];
    setFilter({ natureTypes: next });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">자연환경 유형</p>
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1"
        >
          <Checkbox
            checked={natureTypes.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
