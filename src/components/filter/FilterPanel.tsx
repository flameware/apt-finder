"use client";

import { useAppStore } from "@/store/useAppStore";
import { DistanceSlider } from "./DistanceSlider";
import { NatureTypeFilter } from "./NatureTypeFilter";
import { SigunguFilter } from "./SigunguFilter";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

export function FilterPanel() {
  const filteredCount = useAppStore((s) => s.filteredApartments.length);
  const isLoading = useAppStore((s) => s.isLoadingApartments);
  const sigungu = useAppStore((s) => s.filter.sigungu);
  const resetFilter = useAppStore((s) => s.resetFilter);
  const loadApartments = useAppStore((s) => s.loadApartments);
  const fitMapToFiltered = useAppStore((s) => s.fitMapToFiltered);

  function handleReset() {
    resetFilter();
  }

  async function handleApply() {
    await loadApartments();
    if (sigungu) {
      fitMapToFiltered();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">필터</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs text-muted-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          초기화
        </Button>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <NatureTypeFilter />
        <Separator />
        <DistanceSlider />
        <Separator />
        <SigunguFilter />
      </div>

      {/* Footer: result count + apply */}
      <div className="px-4 py-3 border-t space-y-2">
        <Button
          className="w-full"
          onClick={handleApply}
          disabled={isLoading}
        >
          {isLoading
            ? "검색 중..."
            : `아파트 ${filteredCount.toLocaleString()}개 보기`}
        </Button>
      </div>
    </div>
  );
}
