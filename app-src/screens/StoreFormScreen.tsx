import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useAuthStore } from "../store/authStore";
import { useStoreStore } from "../store/storeStore";
import type { StoreUpsertInput } from "../types/domain";
import type { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "StoreForm">;

export function StoreFormScreen({ navigation, route }: Props) {
  const source = route.params?.store;
  const isAdmin = useAuthStore((state) => state.profile?.role === "admin");
  const saveStore = useStoreStore((state) => state.saveStore);
  const [name, setName] = useState(source?.name ?? "");
  const [address, setAddress] = useState(source?.address ?? "");
  const [lat, setLat] = useState(String(source?.lat ?? 37.5437));
  const [lng, setLng] = useState(String(source?.lng ?? 127.0541));
  const [area, setArea] = useState(source?.area ?? "성수");
  const [instagramUrl, setInstagramUrl] = useState(source?.instagramUrl ?? "");
  const [storeType, setStoreType] = useState(source?.storeType ?? "");
  const [sizeLabel, setSizeLabel] = useState(source?.sizeLabel ?? "보통");
  const [priceLabel, setPriceLabel] = useState(source?.priceLabel ?? "보통");
  const [fittingAvailable, setFittingAvailable] = useState(source?.fittingAvailable ?? false);
  const [description, setDescription] = useState(source?.description ?? "");
  const [recommendation, setRecommendation] = useState(source?.recommendation ?? "");
  const [visitChecklist, setVisitChecklist] = useState(source?.visitChecklist ?? "");
  const [editorComment, setEditorComment] = useState(source?.editorComment ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(source?.coverImageUrl ?? "");
  const [tags, setTags] = useState(source?.tags.join(", ") ?? "");

  async function submit() {
    const input: StoreUpsertInput = {
      id: source?.id || undefined,
      kakaoPlaceId: source?.kakaoPlaceId || route.params?.kakaoPlaceId || null,
      name,
      address,
      lat: Number(lat),
      lng: Number(lng),
      area,
      instagramUrl: instagramUrl || null,
      storeType: storeType || null,
      sizeLabel: sizeLabel as StoreUpsertInput["sizeLabel"],
      priceLabel: priceLabel as StoreUpsertInput["priceLabel"],
      fittingAvailable,
      description: description || null,
      recommendation: recommendation || null,
      visitChecklist: visitChecklist || null,
      editorComment: editorComment || null,
      coverImageUrl: coverImageUrl || null,
      status: source?.status ?? (isAdmin ? "approved" : "pending"),
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };

    try {
      await saveStore(input);
      Alert.alert(
        isAdmin ? "매장 저장 완료" : "가게 등록 요청 완료",
        isAdmin ? "매장 정보가 저장되었습니다." : "관리자 승인 후 지도에 표시됩니다.",
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert("저장 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.formNotice}>
        {isAdmin ? "관리자 직접 등록 매장은 바로 공개됩니다." : "등록한 가게는 관리자 승인 후 지도에 공개됩니다."}
      </Text>
      <Field label="매장명" value={name} onChangeText={setName} />
      <Field label="주소" value={address} onChangeText={setAddress} />
      <View style={styles.row}>
        <Field label="위도" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
        <Field label="경도" value={lng} onChangeText={setLng} keyboardType="decimal-pad" />
      </View>
      <Field label="지역" value={area} onChangeText={setArea} />
      <Field label="인스타그램" value={instagramUrl} onChangeText={setInstagramUrl} />
      <Field label="매장 유형" value={storeType} onChangeText={setStoreType} />
      <View style={styles.row}>
        <Field label="크기" value={sizeLabel} onChangeText={(value) => setSizeLabel(value as typeof sizeLabel)} />
        <Field label="가격대" value={priceLabel} onChangeText={(value) => setPriceLabel(value as typeof priceLabel)} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>피팅 가능</Text>
        <Switch value={fittingAvailable} onValueChange={setFittingAvailable} />
      </View>
      <Field label="태그" value={tags} onChangeText={setTags} placeholder="미니멀, 편집샵" />
      <Field label="대표 이미지 URL" value={coverImageUrl} onChangeText={setCoverImageUrl} />
      <Field label="설명" value={description} onChangeText={setDescription} multiline />
      <Field label="추천 대상" value={recommendation} onChangeText={setRecommendation} multiline />
      <Field label="방문 전 체크" value={visitChecklist} onChangeText={setVisitChecklist} multiline />
      {isAdmin ? <Field label="관리자 코멘트" value={editorComment} onChangeText={setEditorComment} multiline /> : null}
      <Pressable onPress={submit} style={styles.primary}>
        <Text style={styles.primaryText}>{isAdmin ? "저장" : "가게 등록 요청"}</Text>
      </Pressable>
    </ScrollView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad";
};

function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType = "default" }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f1e9",
  },
  content: {
    gap: 12,
    padding: 16,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  formNotice: {
    backgroundColor: "#e9f3ef",
    borderRadius: 8,
    color: "#285e51",
    fontWeight: "800",
    lineHeight: 20,
    padding: 12,
  },
  input: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  label: {
    color: "#77736a",
    fontSize: 12,
    fontWeight: "900",
  },
  primary: {
    alignItems: "center",
    backgroundColor: "#3e8f7b",
    borderRadius: 8,
    padding: 15,
  },
  primaryText: {
    color: "white",
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
});
