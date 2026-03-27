"use client";

import { useAppStore } from "@/store/useAppStore";

export function DistanceSlider() {
  const maxDistanceMeters = useAppStore((s) => s.filter.maxDistanceMeters);
  const setFilter = useAppStore((s) => s.setFilter);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">인접 거리</span>
        <span className="text-muted-foreground font-mono">
          {maxDistanceMeters >= 1000 ? "1km" : `${maxDistanceMeters}m`}
        </span>
      </div>
      <input
        type="range"
        min={100}
        max={1000}
        step={50}
        value={maxDistanceMeters}
        onChange={(e) => setFilter({ maxDistanceMeters: Number(e.target.value) })}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer bg-muted"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>100m</span>
        <span>1km</span>
      </div>
    </div>
  );
}
