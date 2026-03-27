"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";

const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };
const INITIAL_ZOOM = 11;

export function useNaverMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setMapInstance = useAppStore((s) => s.setMapInstance);
  const setMapZoom = useAppStore((s) => s.setMapZoom);
  const setVisibleBounds = useAppStore((s) => s.setVisibleBounds);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;
    if (typeof window === "undefined" || !window.naver?.maps) return;

    const map = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
      zoom: INITIAL_ZOOM,
      mapTypeId: naver.maps.MapTypeId.NORMAL,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: true,
      zoomControlOptions: { position: 3 }, // RIGHT_CENTER
      mapDataControl: false,
      scaleControl: true,
    });

    mapRef.current = map;
    setMapInstance(map);

    // Listen to zoom changes
    naver.maps.Event.addListener(map, "zoom_changed", () => {
      setMapZoom(map.getZoom());
    });

    // Listen to bounds changes — debounced 300ms to avoid thrashing during zoom/pan
    naver.maps.Event.addListener(map, "bounds_changed", () => {
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(() => {
        setVisibleBounds(map.getBounds());
      }, 300);
    });

    // Set initial bounds
    setVisibleBounds(map.getBounds());
  }, [containerRef, setMapInstance, setMapZoom, setVisibleBounds]);

  useEffect(() => {
    // Poll every 100ms until window.naver.maps is ready
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.naver?.maps) {
        clearInterval(interval);
        initMap();
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  return mapRef;
}
