"use client";

import { useAppStore } from "@/store/useAppStore";
import { FacingBadge } from "./FacingBadge";
import { NatureProximityList } from "./NatureProximityList";
import { Button, buttonVariants } from "@/components/ui/button";
import { X, MapPin, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ApartmentDetailPanel() {
  const selectedId = useAppStore((s) => s.selectedApartmentId);
  const apartments = useAppStore((s) => s.apartments);
  const closeDetailPanel = useAppStore((s) => s.closeDetailPanel);
  const mapInstance = useAppStore((s) => s.mapInstance);
  const filter = useAppStore((s) => s.filter);

  const apt = apartments.find((a) => a.id === selectedId);

  if (!apt) return null;

  function handleLocate() {
    if (!mapInstance) return;
    mapInstance.setCenter(new naver.maps.LatLng(apt!.lat, apt!.lng));
    mapInstance.setZoom(15);
  }

  return (
    <div className="flex flex-col h-full bg-background border-l shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-semibold text-sm leading-tight truncate">
            {apt.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {apt.address}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 w-7 h-7"
          onClick={closeDetailPanel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {/* Facing */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              향
            </p>
            <FacingBadge facing={apt.facing} confidence={apt.facingConfidence} />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              위치
            </p>
            <p className="text-sm">{apt.sigungu}</p>
          </div>

          {/* Nearby nature */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              인접 자연환경
            </p>
            <NatureProximityList
              nearbyNature={apt.nearbyNature}
              maxDistance={filter.maxDistanceMeters}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLocate}
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              지도에서 보기
            </Button>
            <a
              href={`https://hogangnono.com/search?q=${encodeURIComponent(apt.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              호갱노노에서 보기
            </a>
            <a
              href={`https://fin.land.naver.com/search?query=${encodeURIComponent(apt.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              네이버페이 부동산에서 보기
            </a>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
