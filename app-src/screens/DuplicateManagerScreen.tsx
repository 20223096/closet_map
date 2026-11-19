import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StoreListItem } from "../components/StoreListItem";
import { useStoreStore } from "../store/storeStore";

export function DuplicateManagerScreen() {
  const { duplicateGroups, loadDuplicates } = useStoreStore();

  useFocusEffect(
    useCallback(() => {
      loadDuplicates();
    }, [loadDuplicates]),
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Admin</Text>
        <Text style={styles.title}>중복 매장 관리</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {duplicateGroups.length === 0 ? <Text style={styles.empty}>현재 감지된 중복 매장이 없습니다.</Text> : null}
        {duplicateGroups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>중복 후보 {group.stores.length}개</Text>
            <Text style={styles.groupReason}>{group.key.startsWith("kakao|") ? "카카오 장소 ID가 같습니다." : "이름, 주소, 좌표가 가깝습니다."}</Text>
            {group.stores.map((store) => (
              <StoreListItem key={store.id} store={store} onPress={() => undefined} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f1e9",
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 16,
  },
  empty: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    color: "#77736a",
    fontWeight: "800",
    padding: 16,
    textAlign: "center",
  },
  eyebrow: {
    color: "#c76573",
    fontWeight: "900",
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    color: "#20201e",
    fontSize: 17,
    fontWeight: "900",
  },
  groupReason: {
    color: "#77736a",
    fontSize: 12,
    fontWeight: "800",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: "#20201e",
    fontSize: 30,
    fontWeight: "900",
  },
});
