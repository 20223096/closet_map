import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { env } from "../lib/env";
import type { KakaoPlace } from "../types/domain";
import type { Store } from "../types/domain";

type Props = {
  center: { lat: number; lng: number };
  kakaoPlaces?: KakaoPlace[];
  onKakaoPlacePress?: (place: KakaoPlace) => void;
  stores: Store[];
  onStorePress: (store: Store) => void;
  style: object;
};

type KakaoMapStatus = "idle" | "loading" | "ready" | "error" | "missing-key";

const SDK_ID = "kakao-map-sdk";

function loadKakaoMapsSdk(appKey: string): Promise<void> {
  if (!appKey) return Promise.reject(new Error("missing-key"));
  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao.maps.load(resolve));
  }

  const existingScript = document.getElementById(SDK_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => window.kakao.maps.load(resolve), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.addEventListener("load", () => window.kakao.maps.load(resolve), { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.appendChild(script);
  });
}

export function StoreMap({ center, kakaoPlaces = [], onKakaoPlacePress, stores, onStorePress, style }: Props) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const [status, setStatus] = useState<KakaoMapStatus>(() => (env.kakaoJavascriptKey ? "idle" : "missing-key"));

  useEffect(() => {
    if (!env.kakaoJavascriptKey) {
      setStatus("missing-key");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    loadKakaoMapsSdk(env.kakaoJavascriptKey)
      .then(() => {
        if (cancelled || !mapElementRef.current) return;
        const kakaoCenter = new window.kakao.maps.LatLng(center.lat, center.lng);
        mapRef.current = new window.kakao.maps.Map(mapElementRef.current, {
          center: kakaoCenter,
          level: 4,
        });
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error instanceof Error && error.message === "missing-key" ? "missing-key" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;

    const kakaoCenter = new window.kakao.maps.LatLng(center.lat, center.lng);
    map.setCenter(kakaoCenter);

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = stores.map((store) => {
      const marker = new window.kakao.maps.Marker({
        map,
        position: new window.kakao.maps.LatLng(store.lat, store.lng),
        title: store.name,
      });
      window.kakao.maps.event.addListener(marker, "click", () => onStorePress(store));
      return marker;
    });
    markersRef.current = [
      ...markersRef.current,
      ...kakaoPlaces.map((place) => {
        const marker = new window.kakao.maps.Marker({
          map,
          position: new window.kakao.maps.LatLng(place.lat, place.lng),
          title: place.placeName,
        });
        window.kakao.maps.event.addListener(marker, "click", () => onKakaoPlacePress?.(place));
        return marker;
      }),
    ];

    if (stores.length > 0 || kakaoPlaces.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      bounds.extend(kakaoCenter);
      stores.forEach((store) => bounds.extend(new window.kakao.maps.LatLng(store.lat, store.lng)));
      kakaoPlaces.forEach((place) => bounds.extend(new window.kakao.maps.LatLng(place.lat, place.lng)));
      map.setBounds(bounds);
    }

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [center.lat, center.lng, kakaoPlaces, onKakaoPlacePress, onStorePress, status, stores]);

  return (
    <View style={[style, styles.shell]}>
      <div ref={mapElementRef} style={styles.mapElement} />
      {status !== "ready" ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {status === "missing-key" ? "카카오 JavaScript 키가 필요합니다." : status === "error" ? "카카오 지도를 불러오지 못했습니다." : "지도를 불러오는 중"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapElement: {
    height: "100%",
    width: "100%",
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(255, 253, 248, 0.9)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  overlayText: {
    color: "#20201e",
    fontSize: 14,
    fontWeight: "900",
  },
  shell: {
    overflow: "hidden",
  },
});
