import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Chip } from "../components/Chip";
import { StoreMap } from "../components/StoreMap";
import { StoreListItem } from "../components/StoreListItem";
import { searchKakaoPlaces } from "../lib/kakao";
import { STYLE_TAGS } from "../lib/sampleStores";
import { useAuthStore } from "../store/authStore";
import { useStoreStore } from "../store/storeStore";
import type { KakaoPlace, Store } from "../types/domain";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NativeStackScreenProps<RootStackParamList>["navigation"];

function getDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const radius = 6371000;
  const latDelta = toRadians(b.lat - a.lat);
  const lngDelta = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function MapScreen() {
  const navigation = useNavigation<Navigation>();
  const [query, setQuery] = useState("");
  const [searchedCenter, setSearchedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [kakaoStorePlaces, setKakaoStorePlaces] = useState<KakaoPlace[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const { stores, selectedTags, currentLocation, loading, loadStores, toggleTag, requestCurrentLocation } = useStoreStore();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const isAdmin = profile?.role === "admin";

  async function runPlaceSearch(nextQuery = query, showError = true) {
    const keyword = nextQuery.trim() || "성수";
    setSearching(true);
    setSearchError("");
    try {
      const searchTerms = [`${keyword} 옷가게`, `${keyword} 의류매장`, `${keyword} 편집샵`, `${keyword} 쇼룸`, `${keyword} 무신사`];
      const [centerResult, ...storeResults] = await Promise.allSettled([
        searchKakaoPlaces(keyword, 5),
        ...searchTerms.map((term) => searchKakaoPlaces(term, 15)),
      ]);
      const centerResults = centerResult.status === "fulfilled" ? centerResult.value : [];
      const successfulStoreResults = storeResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      const failedReason = [centerResult, ...storeResults].find((result) => result.status === "rejected");
      const nextCenter = centerResults[0] ?? successfulStoreResults[0] ?? null;
      setSearchedCenter(nextCenter ? { lat: nextCenter.lat, lng: nextCenter.lng } : null);

      const placesById = new Map<string, KakaoPlace>();
      successfulStoreResults.forEach((place) => placesById.set(place.id, place));
      setKakaoStorePlaces([...placesById.values()]);
      if (!successfulStoreResults.length && failedReason?.status === "rejected") {
        throw failedReason.reason;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "카카오 장소 검색을 다시 시도해주세요.";
      setSearchError(message);
      if (showError) {
        Alert.alert("검색 실패", message);
      }
    } finally {
      setSearching(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadStores(isAdmin);
      if (!kakaoStorePlaces.length) {
        runPlaceSearch("성수", false);
      }
    }, [isAdmin, kakaoStorePlaces.length, loadStores]),
  );

  const filteredStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return stores.filter((store) => {
      const matchesTags = selectedTags.length ? selectedTags.every((tag) => store.tags.includes(tag)) : true;
      const matchesQuery = normalizedQuery
        ? [store.name, store.address, store.area, store.storeType, ...store.tags].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery)) ||
          Boolean(searchedCenter && getDistanceMeters(searchedCenter, store) < 2200)
        : true;
      return matchesTags && matchesQuery;
    });
  }, [query, searchedCenter, selectedTags, stores]);

  const storeCenter = useMemo(() => {
    if (!filteredStores.length) return null;
    const totals = filteredStores.reduce(
      (sum, store) => ({
        lat: sum.lat + store.lat,
        lng: sum.lng + store.lng,
      }),
      { lat: 0, lng: 0 },
    );
    return {
      lat: totals.lat / filteredStores.length,
      lng: totals.lng / filteredStores.length,
    };
  }, [filteredStores]);
  const visibleKakaoPlaces = useMemo(() => {
    const registeredKakaoIds = new Set(stores.map((store) => store.kakaoPlaceId).filter(Boolean));
    return kakaoStorePlaces.filter((place) => !registeredKakaoIds.has(place.id));
  }, [kakaoStorePlaces, stores]);
  const filteredKakaoPlaces = selectedTags.length ? [] : visibleKakaoPlaces;
  const center = searchedCenter ?? currentLocation ?? storeCenter ?? filteredKakaoPlaces[0] ?? { lat: 37.5437, lng: 127.0541 };
  const openStoreDetail = useCallback(
    (store: Store) => {
      navigation.navigate("StoreDetail", { storeId: store.id });
    },
    [navigation],
  );
  const openKakaoPlace = useCallback(
    (place: KakaoPlace) => {
      navigation.navigate("StoreDetail", { kakaoPlace: place });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>성수</Text>
          <Text style={styles.title}>옷가게 지도</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={requestCurrentLocation} style={styles.locationButton}>
            <Text style={styles.locationText}>현재 위치</Text>
          </Pressable>
          <Pressable onPress={signOut} style={styles.logoutButton}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="none"
          clearButtonMode="while-editing"
          onSubmitEditing={() => runPlaceSearch()}
          onChangeText={setQuery}
          placeholder="옷가게 이름, 주소, 스타일 검색"
          style={styles.searchInput}
          value={query}
        />
        <Pressable onPress={() => runPlaceSearch()} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>{searching ? "검색중" : "검색"}</Text>
        </Pressable>
        {isAdmin ? (
          <Pressable onPress={() => navigation.navigate("MainTabs", { screen: "Admin" })} style={styles.adminButton}>
            <Text style={styles.adminText}>관리</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.registrationRow}>
        <Pressable onPress={() => navigation.navigate("StoreForm")} style={styles.registrationButton}>
          <Text style={styles.registrationText}>＋ 가게 등록</Text>
        </Pressable>
        <Text style={styles.registrationHelp}>{isAdmin ? "직접 등록하면 바로 공개돼요." : "없는 가게를 알려주세요."}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
        {STYLE_TAGS.map((tag) => (
          <Chip key={tag} label={tag} active={selectedTags.includes(tag)} onPress={() => toggleTag(tag)} />
        ))}
      </ScrollView>

      <StoreMap center={center} kakaoPlaces={filteredKakaoPlaces} stores={filteredStores} onKakaoPlacePress={openKakaoPlace} onStorePress={openStoreDetail} style={styles.map} />

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? <ActivityIndicator /> : null}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>옷가게 {filteredStores.length + filteredKakaoPlaces.length}곳</Text>
          <Text style={styles.sectionMeta}>등록 매장 {filteredStores.length}곳 · 카카오 검색 {filteredKakaoPlaces.length}곳</Text>
        </View>
        {searchError ? (
          <View style={styles.searchError}>
            <Text style={styles.searchErrorTitle}>카카오 검색 설정 확인 필요</Text>
            <Text style={styles.searchErrorText}>{searchError}</Text>
          </View>
        ) : null}
        {!loading && !filteredStores.length && !filteredKakaoPlaces.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>표시할 옷가게가 없어요</Text>
            <Text style={styles.emptyText}>
              {stores.length ? "검색어나 스타일 태그를 줄여보세요." : isAdmin ? "관리 화면에서 매장을 등록하거나 승인 상태를 확인해보세요." : "관리자가 승인한 매장이 아직 없습니다."}
            </Text>
          </View>
        ) : null}
        {filteredStores.map((store) => (
          <StoreListItem key={store.id} store={store} onPress={() => openStoreDetail(store)} />
        ))}
        {filteredKakaoPlaces.length ? <Text style={styles.sectionTitle}>카카오에 등록된 옷가게</Text> : null}
        {filteredKakaoPlaces.map((place) => (
          <Pressable key={place.id} onPress={() => openKakaoPlace(place)} style={styles.place}>
            <Text style={styles.placeName}>{place.placeName}</Text>
            <Text numberOfLines={1} style={styles.placeAddress}>
              {place.roadAddressName || place.addressName}
            </Text>
            <Text style={styles.placeMeta}>눌러서 상세 보기</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  adminButton: {
    alignItems: "center",
    backgroundColor: "#151310",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  adminText: {
    color: "white",
    fontWeight: "900",
  },
  chips: {
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 3,
    paddingTop: 3,
  },
  chipScroller: {
    flexGrow: 0,
    maxHeight: 30,
  },
  container: {
    backgroundColor: "#f4eadc",
    flex: 1,
  },
  eyebrow: {
    color: "#c25263",
    fontSize: 12,
    fontWeight: "900",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    padding: 16,
    paddingTop: 12,
  },
  listHeader: {
    gap: 2,
  },
  locationButton: {
    backgroundColor: "#123b35",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationText: {
    color: "white",
    fontWeight: "900",
  },
  logoutButton: {
    backgroundColor: "#fff8ed",
    borderColor: "#cdbda8",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  logoutText: {
    color: "#5e5448",
    fontSize: 12,
    fontWeight: "900",
  },
  map: {
    borderRadius: 8,
    borderColor: "#cdbda8",
    borderWidth: 1,
    height: 260,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  empty: {
    backgroundColor: "#fff9ee",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  emptyText: {
    color: "#766b5e",
    fontWeight: "700",
  },
  emptyTitle: {
    color: "#171512",
    fontSize: 16,
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: "#fffaf3",
    borderColor: "#cdbda8",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#2f7b6d",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  searchButtonText: {
    color: "white",
    fontWeight: "900",
  },
  searchError: {
    backgroundColor: "#fff2ee",
    borderColor: "#dc9d91",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  searchErrorText: {
    color: "#9b4738",
    fontSize: 12,
    fontWeight: "700",
  },
  searchErrorTitle: {
    color: "#7a2f25",
    fontWeight: "900",
  },
  place: {
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  placeAddress: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "700",
  },
  placeMeta: {
    color: "#2f7b6d",
    fontSize: 12,
    fontWeight: "900",
  },
  placeName: {
    color: "#171512",
    fontSize: 16,
    fontWeight: "900",
  },
  registrationButton: {
    backgroundColor: "#123b35",
    borderColor: "#123b35",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  registrationHelp: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "700",
  },
  registrationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  registrationText: {
    color: "#fffaf3",
    fontWeight: "900",
  },
  sectionMeta: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#171512",
    fontSize: 17,
    fontWeight: "900",
  },
  title: {
    color: "#171512",
    fontSize: 30,
    fontWeight: "900",
  },
});
