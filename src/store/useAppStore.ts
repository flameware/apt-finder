import { create } from "zustand";
import type { Apartment, FilterState, NatureFeature } from "@/types";
import { DEFAULT_FILTER } from "@/types";
import { filterApartments } from "@/lib/filter";

interface AppState {
  // --- Data ---
  apartments: Apartment[];
  natureFeatures: NatureFeature[];
  isLoadingApartments: boolean;
  isLoadingNature: boolean;
  loadError: string | null;

  // --- Filter ---
  filter: FilterState;
  filteredApartments: Apartment[];

  // --- Map ---
  mapInstance: naver.maps.Map | null;
  mapZoom: number;
  visibleBounds: naver.maps.LatLngBounds | null;

  // --- Selection ---
  selectedApartmentId: string | null;

  // --- UI ---
  isFilterPanelOpen: boolean;
  isDetailPanelOpen: boolean;

  // --- Actions ---
  loadApartments: () => Promise<void>;
  loadNatureFeatures: () => Promise<void>;
  setFilter: (patch: Partial<FilterState>) => void;
  resetFilter: () => void;
  setMapInstance: (map: naver.maps.Map) => void;
  setMapZoom: (zoom: number) => void;
  setVisibleBounds: (bounds: naver.maps.LatLngBounds) => void;
  selectApartment: (id: string | null) => void;
  fitMapToFiltered: () => void;
  toggleFilterPanel: () => void;
  closeDetailPanel: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- Initial State ---
  apartments: [],
  natureFeatures: [],
  isLoadingApartments: false,
  isLoadingNature: false,
  loadError: null,
  filter: DEFAULT_FILTER,
  filteredApartments: [],
  mapInstance: null,
  mapZoom: 11,
  visibleBounds: null,
  selectedApartmentId: null,
  isFilterPanelOpen: true,
  isDetailPanelOpen: false,

  // --- Actions ---
  loadApartments: async () => {
    if (get().isLoadingApartments) return;
    set({ isLoadingApartments: true, loadError: null });
    try {
      const filter = get().filter;
      const params = new URLSearchParams();
      params.set("maxDist", String(filter.maxDistanceMeters));
      if (filter.natureTypes.length > 0) {
        params.set("types", filter.natureTypes.join(","));
      }
      if (filter.facingDirections.length > 0) {
        params.set("facing", filter.facingDirections.join(","));
      }
      if (filter.sigungu) {
        params.set("sigungu", filter.sigungu);
      }

      const res = await fetch(`/api/apartments?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: Apartment[] = await res.json();

      set({
        apartments: data,
        filteredApartments: filterApartments(data, get().filter),
        isLoadingApartments: false,
      });
    } catch (err) {
      set({
        loadError: err instanceof Error ? err.message : "데이터 로드 실패",
        isLoadingApartments: false,
      });
    }
  },

  loadNatureFeatures: async () => {
    if (get().isLoadingNature || get().natureFeatures.length > 0) return;
    set({ isLoadingNature: true });
    try {
      const res = await fetch("/data/nature.geojson");
      if (!res.ok) throw new Error("nature.geojson 로드 실패");
      const geojson = await res.json();
      const features: NatureFeature[] = (geojson.features ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f: any) => ({
          id: f.id ?? String(f.properties?.id ?? Math.random()),
          type: f.properties?.type as NatureFeature["type"],
          name: f.properties?.name ?? null,
          geometry: f.geometry,
          centroidLat: f.properties?.centroidLat ?? 0,
          centroidLng: f.properties?.centroidLng ?? 0,
        })
      );
      set({ natureFeatures: features, isLoadingNature: false });
    } catch {
      set({ isLoadingNature: false });
    }
  },

  setFilter: (patch) => {
    const newFilter = { ...get().filter, ...patch };
    const newFiltered = filterApartments(get().apartments, newFilter);
    set({ filter: newFilter, filteredApartments: newFiltered });
  },

  resetFilter: () => {
    const newFiltered = filterApartments(get().apartments, DEFAULT_FILTER);
    set({ filter: DEFAULT_FILTER, filteredApartments: newFiltered });
  },

  setMapInstance: (map) => set({ mapInstance: map }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setVisibleBounds: (bounds) => set({ visibleBounds: bounds }),

  selectApartment: (id) =>
    set({
      selectedApartmentId: id,
      isDetailPanelOpen: id !== null,
    }),

  fitMapToFiltered: () => {
    const { mapInstance, filteredApartments } = get();
    if (!mapInstance || filteredApartments.length === 0) return;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const apt of filteredApartments) {
      if (apt.lat < minLat) minLat = apt.lat;
      if (apt.lat > maxLat) maxLat = apt.lat;
      if (apt.lng < minLng) minLng = apt.lng;
      if (apt.lng > maxLng) maxLng = apt.lng;
    }
    const bounds = new naver.maps.LatLngBounds(
      new naver.maps.LatLng(minLat, minLng),
      new naver.maps.LatLng(maxLat, maxLng),
    );
    mapInstance.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  },

  toggleFilterPanel: () =>
    set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen })),

  closeDetailPanel: () =>
    set({ isDetailPanelOpen: false, selectedApartmentId: null }),
}));
