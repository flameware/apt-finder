"use client";

import { useRef, useEffect } from "react";
import { useNaverMap } from "@/hooks/useNaverMap";
import { useAppStore } from "@/store/useAppStore";
import { ApartmentMarkers } from "./ApartmentMarkers";

export default function NaverMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  useNaverMap(containerRef);
  const mapInstance = useAppStore((s) => s.mapInstance);
  const mapZoom = useAppStore((s) => s.mapZoom);
  const loadApartments = useAppStore((s) => s.loadApartments);
  // Load data once map is ready
  useEffect(() => {
    if (mapInstance) {
      loadApartments();
    }
  }, [mapInstance, loadApartments]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {mapInstance && (
        <ApartmentMarkers map={mapInstance} zoom={mapZoom} />
      )}
    </div>
  );
}
