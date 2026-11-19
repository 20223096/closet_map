import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StoreListItem } from "../components/StoreListItem";
import { useAuthStore } from "../store/authStore";
import { useStoreStore } from "../store/storeStore";
import type { PendingReviewItem } from "../types/domain";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NativeStackScreenProps<RootStackParamList>["navigation"];

export function AdminStoresScreen() {
  const navigation = useNavigation<Navigation>();
  const [query, setQuery] = useState("");
  const { stores, kakaoPlaces, pendingReviewItems, loadPendingReviews, loadStores, reviewPendingGroup, searchPlaces } = useStoreStore();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const isAdmin = profile?.role === "admin";

  useFocusEffect(
    useCallback(() => {
      loadStores(true);
      loadPendingReviews();
    }, [loadPendingReviews, loadStores]),
  );

  async function runSearch() {
    try {
      await searchPlaces(query);
    } catch (error) {
      Alert.alert("검색 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Admin</Text>
          <Text style={styles.title}>매장 관리</Text>
        </View>
        <Pressable onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        {!isAdmin ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>관리자 권한 확인 필요</Text>
            <Text style={styles.noticeText}>매장 등록/수정과 승인 대기 매장 조회는 Supabase profiles.role이 admin이어야 동작합니다.</Text>
          </View>
        ) : null}
        <Pressable onPress={() => navigation.navigate("StoreForm")} style={styles.primary}>
          <Text style={styles.primaryText}>직접 등록</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <TextInput value={query} onChangeText={setQuery} placeholder="카카오 장소 검색: 성수 옷가게" style={styles.input} />
        <Pressable onPress={runSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>검색</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>승인 대기</Text>
        {pendingReviewItems.length === 0 ? <Text style={styles.empty}>승인 대기 항목이 없습니다.</Text> : null}
        {groupPendingItems(pendingReviewItems).map((group) => (
          <PendingStoreCard
            key={group.key}
            items={group.items}
            onApprove={() => reviewPendingGroup(group.items, "approved")}
            onReject={() => reviewPendingGroup(group.items, "rejected")}
          />
        ))}

        {kakaoPlaces.map((place) => (
          <Pressable
            key={place.id}
            onPress={() =>
              navigation.navigate("StoreForm", {
                kakaoPlaceId: place.id,
                store: {
                  id: "",
                  kakaoPlaceId: place.id,
                  name: place.placeName,
                  address: place.roadAddressName || place.addressName,
                  lat: place.lat,
                  lng: place.lng,
                  area: "성수",
                  fittingAvailable: false,
                  status: "pending",
                  tags: [],
                },
              })
            }
            style={styles.place}
          >
            <Text style={styles.placeName}>{place.placeName}</Text>
            <Text style={styles.placeAddress}>{place.roadAddressName || place.addressName}</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>등록된 매장</Text>
        {stores.map((store) => (
          <StoreListItem key={store.id} store={store} onPress={() => navigation.navigate("StoreForm", { store })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function groupPendingItems(items: PendingReviewItem[]) {
  const groups = new Map<string, PendingReviewItem[]>();
  items.forEach((item) => {
    const storeId = item.kind === "store" ? item.item.id : item.item.storeId;
    const key = storeId ?? `${item.kind}-${item.item.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return [...groups.entries()].map(([key, groupedItems]) => ({ key, items: groupedItems }));
}

function requestLabel(item: PendingReviewItem) {
  if (item.kind === "store") return "카카오 매장 등록";
  if (item.kind === "photo") return "사진";
  const labels = {
    tag: "스타일",
    description: "긴 설명",
    instagram_url: "인스타그램 URL",
    new_store: "신규 매장",
    edit_store: "매장 수정",
  };
  const value = item.item.payload.tag ?? item.item.payload.description ?? item.item.payload.instagramUrl;
  return `${labels[item.item.contributionType]}${typeof value === "string" ? `: ${value}` : ""}`;
}

function PendingStoreCard({ items, onApprove, onReject }: { items: PendingReviewItem[]; onApprove: () => void; onReject: () => void }) {
  const storeItem = items.find((item) => item.kind === "store");
  const relatedItem = items.find((item) => item.kind !== "store");
  const title =
    storeItem?.kind === "store"
      ? storeItem.item.name
      : relatedItem?.kind === "photo"
        ? relatedItem.item.storeName ?? "매장"
        : relatedItem?.kind === "contribution"
          ? relatedItem.item.storeName ?? "매장"
          : "매장";
  const address =
    storeItem?.kind === "store"
      ? storeItem.item.address
      : relatedItem?.kind === "contribution"
        ? relatedItem.item.storeAddress
        : null;

  return (
    <View style={styles.pendingCard}>
      <Text style={styles.pendingKind}>매장별 승인 요청 · {items.length}건</Text>
      <Text style={styles.placeName}>{title}</Text>
      {address ? <Text style={styles.placeAddress}>{address}</Text> : null}
      <View style={styles.requestList}>
        {items.map((item) => <Text key={`${item.kind}-${item.item.id}`} style={styles.requestText}>• {requestLabel(item)}</Text>)}
      </View>
      <View style={styles.pendingActions}>
        <Pressable onPress={onApprove} style={styles.approve}>
          <Text style={styles.approveText}>승인</Text>
        </Pressable>
        <Pressable onPress={onReject} style={styles.reject}>
          <Text style={styles.rejectText}>반려</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  container: {
    backgroundColor: "#f6f1e9",
    flex: 1,
  },
  content: {
    gap: 10,
    padding: 16,
  },
  approve: {
    alignItems: "center",
    backgroundColor: "#3e8f7b",
    borderRadius: 8,
    flex: 1,
    padding: 10,
  },
  approveText: {
    color: "white",
    fontWeight: "900",
  },
  empty: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    color: "#77736a",
    fontWeight: "800",
    padding: 12,
    textAlign: "center",
  },
  eyebrow: {
    color: "#c76573",
    fontWeight: "900",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  input: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  place: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  placeAddress: {
    color: "#77736a",
    fontWeight: "700",
    marginTop: 4,
  },
  placeName: {
    color: "#20201e",
    fontSize: 16,
    fontWeight: "900",
  },
  pendingActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  pendingCard: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  pendingKind: {
    color: "#c76573",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  requestList: {
    gap: 4,
    marginTop: 10,
  },
  requestText: {
    color: "#4f4b44",
    fontSize: 13,
    fontWeight: "700",
  },
  notice: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 10,
    padding: 12,
  },
  noticeText: {
    color: "#77736a",
    fontSize: 12,
    fontWeight: "700",
  },
  noticeTitle: {
    color: "#20201e",
    fontWeight: "900",
  },
  primary: {
    alignItems: "center",
    backgroundColor: "#3e8f7b",
    borderRadius: 8,
    padding: 14,
  },
  primaryText: {
    color: "white",
    fontWeight: "900",
  },
  searchBox: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#20201e",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  searchButtonText: {
    color: "white",
    fontWeight: "900",
  },
  reject: {
    alignItems: "center",
    backgroundColor: "#fff5f2",
    borderColor: "#e5b4a8",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  rejectText: {
    color: "#9b4738",
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#20201e",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  signOut: {
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  signOutText: {
    color: "#20201e",
    fontWeight: "900",
  },
  title: {
    color: "#20201e",
    fontSize: 30,
    fontWeight: "900",
  },
});
