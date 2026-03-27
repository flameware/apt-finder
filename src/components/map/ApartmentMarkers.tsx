"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Apartment } from "@/types";

const MAX_VISIBLE_MARKERS = 500;

interface Props {
  map: naver.maps.Map;
  zoom: number;
}

function makeMarkerIcon(apt: Apartment, isSelected: boolean): naver.maps.HtmlIcon {
  const stroke = isSelected ? "#EEF2F2" : "#8BA0A7";
  const strokeWidth = isSelected ? 2.5 : 1.5;
  const w = isSelected ? 22 : 16;
  const h = isSelected ? 30 : 22;

  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C7.268 0 1 6.268 1 14c0 9.625 14 26 14 26S29 23.625 29 14C29 6.268 22.732 0 15 0z" fill="#244052" stroke="${stroke}" stroke-width="${strokeWidth}"/>
  </svg>`;

  return {
    content: svg,
    size: new naver.maps.Size(w, h),
    anchor: new naver.maps.Point(w / 2, h),
  };
}

export function ApartmentMarkers({ map, zoom }: Props) {
  const filteredApartments = useAppStore((s) => s.filteredApartments);
  const selectedApartmentId = useAppStore((s) => s.selectedApartmentId);
  const selectApartment = useAppStore((s) => s.selectApartment);
  const markersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const aptMapRef = useRef<Map<string, Apartment>>(new Map());
  const zoomRef = useRef(zoom);

  // Keep zoomRef in sync without triggering re-renders
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Re-render markers when filtered apartments change
  useEffect(() => {
    if (zoomRef.current < 9) {
      for (const marker of markersRef.current.values()) marker.setMap(null);
      markersRef.current.clear();
      aptMapRef.current.clear();
      return;
    }

    const toShow = filteredApartments.slice(0, MAX_VISIBLE_MARKERS);
    const toShowIds = new Set(toShow.map((a) => a.id));

    // Rebuild apt lookup map
    aptMapRef.current.clear();
    for (const apt of toShow) aptMapRef.current.set(apt.id, apt);

    // Remove stale markers
    for (const [id, marker] of markersRef.current.entries()) {
      if (!toShowIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    // Add new markers
    for (const apt of toShow) {
      if (markersRef.current.has(apt.id)) continue;

      const marker = new naver.maps.Marker({
        map,
        position: new naver.maps.LatLng(apt.lat, apt.lng),
        icon: makeMarkerIcon(apt, apt.id === selectedApartmentId),
        title: apt.name,
        clickable: true,
        zIndex: apt.id === selectedApartmentId ? 10 : 1,
      });

      naver.maps.Event.addListener(marker, "click", () => {
        selectApartment(apt.id);
      });

      markersRef.current.set(apt.id, marker);
    }
  }, [filteredApartments, map, selectedApartmentId, selectApartment]);

  // Update selected marker appearance — O(n) marker iteration, O(1) apt lookup
  useEffect(() => {
    for (const [id, marker] of markersRef.current.entries()) {
      const apt = aptMapRef.current.get(id);
      if (apt) {
        marker.setIcon(makeMarkerIcon(apt, id === selectedApartmentId));
        marker.setZIndex(id === selectedApartmentId ? 10 : 1);
        marker.setMap(map);
      }
    }
  }, [selectedApartmentId, map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.setMap(null);
      markersRef.current.clear();
      aptMapRef.current.clear();
    };
  }, []);

  return null;
}
