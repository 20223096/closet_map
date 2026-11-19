declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
    }

    class LatLngBounds {
      extend(latlng: LatLng): void;
    }

    class Map {
      constructor(container: HTMLElement, options: { center: LatLng; level: number });
      setBounds(bounds: LatLngBounds): void;
      setCenter(latlng: LatLng): void;
    }

    class Marker {
      constructor(options: { map: Map; position: LatLng; title?: string });
      setMap(map: Map | null): void;
    }

    namespace event {
      function addListener(target: Marker, type: "click", handler: () => void): void;
    }
  }

  interface Window {
    kakao: {
      maps: typeof kakao.maps & {
        load(callback: () => void): void;
      };
    };
  }
}

export {};
