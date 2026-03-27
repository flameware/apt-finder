"use client";

import { useAppStore } from "@/store/useAppStore";
import { getSigunguList } from "@/lib/filter";

export function SigunguFilter() {
  const sigungu = useAppStore((s) => s.filter.sigungu);
  const apartments = useAppStore((s) => s.apartments);
  const setFilter = useAppStore((s) => s.setFilter);

  const options = getSigunguList(apartments);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">지역</p>
      <select
        value={sigungu ?? ""}
        onChange={(e) => setFilter({ sigungu: e.target.value || null })}
        className="w-full text-sm border rounded px-2 py-1.5 bg-background text-foreground border-border"
      >
        <option value="">전체 (수도권)</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
