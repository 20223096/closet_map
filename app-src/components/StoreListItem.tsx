import { Image, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";

import type { Store } from "../types/domain";

type Props = {
  store: Store;
  onPress: NonNullable<PressableProps["onPress"]>;
};

export function StoreListItem({ store, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {store.coverImageUrl ? (
        <Image source={{ uri: store.coverImageUrl }} style={styles.image} />
      ) : (
        <View style={styles.imageFallback} />
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={styles.meta}>
          {store.storeType || "매장"} · {store.priceLabel || "가격 미정"} · {store.sizeLabel || "크기 미정"}
        </Text>
        <Text numberOfLines={1} style={styles.tags}>
          {store.tags.join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 5,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  image: {
    borderRadius: 6,
    height: 66,
    width: 66,
  },
  imageFallback: {
    backgroundColor: "#dce9e1",
    borderRadius: 6,
    height: 66,
    width: 66,
  },
  meta: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "700",
  },
  name: {
    color: "#171512",
    fontSize: 16,
    fontWeight: "900",
  },
  tags: {
    color: "#2e7769",
    fontSize: 12,
    fontWeight: "800",
  },
});
