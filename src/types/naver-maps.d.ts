// Minimal type declarations for Naver Maps JavaScript API v3 (CDN loaded)
// Full types: https://navermaps.github.io/maps.js.ncp/docs/

declare namespace naver {
  namespace maps {
    class Map {
      constructor(el: HTMLElement | string, options?: MapOptions);
      getCenter(): LatLng;
      setCenter(latlng: LatLng): void;
      getZoom(): number;
      setZoom(zoom: number, effect?: boolean): void;
      getBounds(): LatLngBounds;
      panTo(latlng: LatLng, transitionOptions?: object): void;
      fitBounds(bounds: LatLngBounds, margin?: object): void;
      addListener(event: string, handler: (...args: unknown[]) => void): MapEventListener;
      removeListener(listener: MapEventListener): void;
      destroy(): void;
    }

    class Marker {
      constructor(options?: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latlng: LatLng): void;
      getPosition(): LatLng;
      setIcon(icon: string | ImageIcon | SymbolIcon | HtmlIcon): void;
      addListener(event: string, handler: (...args: unknown[]) => void): MapEventListener;
    }

    class Polygon {
      constructor(options?: PolygonOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setOptions(options: PolygonOptions): void;
    }

    class Circle {
      constructor(options?: CircleOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
    }

    class InfoWindow {
      constructor(options?: InfoWindowOptions);
      open(map: Map, latlng: LatLng): void;
      close(): void;
      setContent(content: string | HTMLElement): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
      equals(latlng: LatLng): boolean;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      getSW(): LatLng;
      getNE(): LatLng;
      getCenter(): LatLng;
      extend(latlng: LatLng): void;
      hasLatLng(latlng: LatLng): boolean;
      toJSON(): { minLat: number; minLng: number; maxLat: number; maxLng: number };
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    class MarkerClustering {
      constructor(options: any);
      setMap(map: Map | null): void;
    }

    interface MapOptions {
      center?: LatLng;
      zoom?: number;
      mapTypeId?: string;
      minZoom?: number;
      maxZoom?: number;
      zoomControl?: boolean;
      zoomControlOptions?: object;
      mapDataControl?: boolean;
      scaleControl?: boolean;
    }

    interface MarkerOptions {
      map?: Map;
      position?: LatLng;
      icon?: string | ImageIcon | SymbolIcon | HtmlIcon;
      title?: string;
      clickable?: boolean;
      zIndex?: number;
    }

    interface ImageIcon {
      url: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
    }

    interface SymbolIcon {
      path: string | SymbolPath;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
    }

    interface HtmlIcon {
      content: string | HTMLElement;
      size?: Size;
      anchor?: Point;
    }

    interface PolygonOptions {
      map?: Map;
      paths?: LatLng[][] | LatLng[];
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
      clickable?: boolean;
      zIndex?: number;
    }

    interface CircleOptions {
      map?: Map;
      center?: LatLng;
      radius?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
    }

    interface InfoWindowOptions {
      content?: string | HTMLElement;
      maxWidth?: number;
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
      disableAnchor?: boolean;
      pixelOffset?: Point;
    }

    interface MapEventListener {
      id: string;
      eventName: string;
    }

    const MapTypeId: {
      NORMAL: string;
      TERRAIN: string;
      SATELLITE: string;
      HYBRID: string;
    };

    const SymbolPath: {
      BACKWARD_CLOSED_ARROW: string;
      BACKWARD_OPEN_ARROW: string;
      CIRCLE: string;
      FORWARD_CLOSED_ARROW: string;
      FORWARD_OPEN_ARROW: string;
    };

    namespace Event {
      function addListener(
        target: object,
        event: string,
        handler: (...args: unknown[]) => void
      ): MapEventListener;
      function removeListener(listener: MapEventListener): void;
      function trigger(target: object, event: string, ...args: unknown[]): void;
    }
  }
}
