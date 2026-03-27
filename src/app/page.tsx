"use client";

import dynamic from "next/dynamic";
import { FilterPanel } from "@/components/filter/FilterPanel";
import { ApartmentDetailPanel } from "@/components/detail/ApartmentDetailPanel";
import { useAppStore } from "@/store/useAppStore";
import { SlidersHorizontal, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// NaverMap must be loaded client-side only (window.naver not available on server)
const NaverMap = dynamic(() => import("@/components/map/NaverMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <div className="text-sm text-muted-foreground">지도 로딩 중...</div>
    </div>
  ),
});

export default function Home() {
  const isDetailPanelOpen = useAppStore((s) => s.isDetailPanelOpen);
  const filteredCount = useAppStore((s) => s.filteredApartments.length);
  const isLoading = useAppStore((s) => s.isLoadingApartments);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b bg-background shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-600" />
          <span className="font-bold text-sm">숲뷰 아파트 찾기</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            산·숲·호수 인접 남향 아파트
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && filteredCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {filteredCount.toLocaleString()}개
            </span>
          )}
          {/* Mobile: filter trigger */}
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm" className="md:hidden">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-72 p-0">
              <FilterPanel />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop: filter sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r overflow-hidden shrink-0">
          <FilterPanel />
        </aside>

        {/* Map */}
        <main className="flex-1 relative overflow-hidden">
          <NaverMap />
        </main>

        {/* Detail panel (desktop) */}
        {isDetailPanelOpen && (
          <aside className="hidden sm:flex w-72 flex-col border-l overflow-hidden shrink-0">
            <ApartmentDetailPanel />
          </aside>
        )}

        {/* Detail panel (mobile bottom sheet) */}
        {isDetailPanelOpen && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 h-72 z-50 shadow-lg">
            <ApartmentDetailPanel />
          </div>
        )}
      </div>
    </div>
  );
}
