import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listSavedPlaces } from "../lib/participationRepository";
import type { SavedPlace } from "../types/domain";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NativeStackScreenProps<RootStackParamList>["navigation"];

export function SavedStoresScreen() {
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listSavedPlaces()
        .then((nextItems) => active && setItems(nextItems))
        .catch((error) => Alert.alert("찜 목록 불러오기 실패", error instanceof Error ? error.message : "다시 시도해주세요."))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>My Closet Map</Text>
        <Text style={styles.title}>찜한 매장</Text>
      </View>
      {loading ? <ActivityIndicator style={styles.loading} /> : null}
      {!loading && !items.length ? <Text style={styles.empty}>아직 찜한 매장이 없어요.</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => {
          const store = item.kind === "store" ? item.store : null;
          const place = item.kind === "kakao" ? item.kakaoPlace : null;
          return (
            <Pressable
              key={store?.id ?? `kakao-${place!.id}`}
              onPress={() => navigation.navigate("StoreDetail", store ? { storeId: store.id } : { kakaoPlace: place! })}
              style={styles.card}
            >
              <Text style={styles.name}>{store?.name ?? place!.placeName}</Text>
              <Text style={styles.address}>{store?.address ?? (place!.roadAddressName || place!.addressName)}</Text>
              <Text style={styles.source}>{store ? "등록 매장" : "카카오 매장"}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  address: { color: "#77736a", lineHeight: 20 },
  card: { backgroundColor: "white", borderRadius: 14, gap: 5, padding: 16 },
  container: { backgroundColor: "#f6f1e9", flex: 1 },
  content: { gap: 10, padding: 16 },
  empty: { color: "#77736a", padding: 24, textAlign: "center" },
  eyebrow: { color: "#8a5d3b", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16 },
  loading: { marginTop: 32 },
  name: { color: "#20201e", fontSize: 18, fontWeight: "900" },
  source: { color: "#8a5d3b", fontSize: 12, fontWeight: "700" },
  title: { color: "#20201e", fontSize: 28, fontWeight: "900", marginTop: 4 },
});
