import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ensureParticipationStore, getVoteSummary, isStoreSaved, listStorePhotos, submitContribution, submitVote, toggleSavedStore, uploadStorePhoto } from "../lib/participationRepository";
import { findStoreByKakaoPlaceId } from "../lib/storeRepository";
import { useAuthStore } from "../store/authStore";
import { useStoreStore } from "../store/storeStore";
import type { ParticipationVoteType, Store, StorePhoto, VoteSummary } from "../types/domain";
import type { RootStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "StoreDetail">;

export function StoreDetailScreen({ navigation, route }: Props) {
  const [tagInput, setTagInput] = useState("");
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState("");
  const [instagramInput, setInstagramInput] = useState("");
  const [draftVotes, setDraftVotes] = useState<Partial<Record<ParticipationVoteType, string>>>({});
  const [submittingParticipation, setSubmittingParticipation] = useState(false);
  const [linkedStore, setLinkedStore] = useState<Store | null>(null);
  const [photos, setPhotos] = useState<StorePhoto[]>([]);
  const [saved, setSaved] = useState(false);
  const [voteSummary, setVoteSummary] = useState<VoteSummary>({ style: {}, size: {}, price: {}, shopping: {}, comfort: {} });
  const store = useStoreStore((state) => state.stores.find((item) => item.id === route.params.storeId));
  const addKakaoPlaceTag = useStoreStore((state) => state.addKakaoPlaceTag);
  const kakaoPlaceTags = useStoreStore((state) => state.kakaoPlaceTags);
  const removeKakaoPlaceTag = useStoreStore((state) => state.removeKakaoPlaceTag);
  const role = useAuthStore((state) => state.profile?.role);
  const kakaoPlace = route.params.kakaoPlace;
  const activeStore = store ?? linkedStore;
  const isKakaoPlace = !store && Boolean(kakaoPlace);

  useEffect(() => {
    if (store || !kakaoPlace) {
      setLinkedStore(null);
      return;
    }
    let active = true;
    findStoreByKakaoPlaceId(kakaoPlace.id)
      .then((foundStore) => {
        if (active) setLinkedStore(foundStore);
      })
      .catch(() => {
        if (active) setLinkedStore(null);
      });
    return () => {
      active = false;
    };
  }, [store?.id, kakaoPlace?.id]);

  useEffect(() => {
    const storeId = activeStore?.id;
    if (!storeId) return;
    getVoteSummary(storeId).then(setVoteSummary).catch(() => undefined);
    listStorePhotos(storeId, role === "admin").then(setPhotos).catch(() => undefined);
  }, [activeStore?.id, role]);

  useEffect(() => {
    isStoreSaved({ store, kakaoPlace }).then(setSaved).catch(() => undefined);
  }, [store?.id, kakaoPlace?.id]);

  if (!activeStore && !kakaoPlace) {
    return (
      <View style={styles.empty}>
        <Text>매장을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const name = activeStore?.name ?? kakaoPlace!.placeName;
  const address = activeStore?.address ?? (kakaoPlace!.roadAddressName || kakaoPlace!.addressName);
  const lat = activeStore?.lat ?? kakaoPlace!.lat;
  const lng = activeStore?.lng ?? kakaoPlace!.lng;
  const area = activeStore?.area ?? "카카오 장소";
  const storeType = activeStore?.storeType ?? "옷가게";
  const customTags = kakaoPlace ? kakaoPlaceTags[kakaoPlace.id] ?? [] : [];
  const topStyle = getTopVote(voteSummary.style);
  const visibleTags = activeStore?.tags.length ? activeStore.tags : ["카카오 등록", "옷가게", "상세 확인 가능", ...customTags];
  const highlightedTags = topStyle && !visibleTags.includes(topStyle.value) ? [topStyle.value, ...visibleTags] : visibleTags;
  const kakaoDirections = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  const kakaoMap = `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;

  function submitTag() {
    if (!kakaoPlace) return;
    addKakaoPlaceTag(kakaoPlace.id, tagInput);
    setTagInput("");
  }

  async function submitParticipation() {
    const hasInput = Object.values(draftVotes).some(Boolean) || descriptionInput.trim() || instagramInput.trim();
    if (!hasInput) {
      Alert.alert("제보 내용 없음", "한 가지 이상 선택하거나 입력해주세요.");
      return;
    }
    setSubmittingParticipation(true);
    try {
      const nextStore = await ensureParticipationStore({ store: activeStore, kakaoPlace });
      const immediateVotes = Object.entries(draftVotes).filter(([type]) => type !== "style") as Array<[ParticipationVoteType, string]>;
      const tasks: Promise<unknown>[] = immediateVotes.map(([voteType, voteValue]) =>
        submitVote({ store: nextStore, voteType, voteValue }),
      );
      if (draftVotes.style) {
        tasks.push(submitContribution({
          store: nextStore,
          contributionType: "tag",
          payload: { tag: draftVotes.style, kind: "style" },
        }));
      }
      if (descriptionInput.trim()) {
        tasks.push(submitContribution({
          store: nextStore,
          contributionType: "description",
          payload: { description: descriptionInput.trim() },
        }));
      }
      if (instagramInput.trim()) {
        tasks.push(submitContribution({
          store: nextStore,
          contributionType: "instagram_url",
          payload: { instagramUrl: instagramInput.trim() },
        }));
      }
      await Promise.all(tasks);
      setLinkedStore(nextStore);
      setVoteSummary(await getVoteSummary(nextStore.id));
      setDraftVotes({});
      setDescriptionInput("");
      setInstagramInput("");
      setShowVoteForm(false);
      Alert.alert(
        "제보 등록 완료",
        draftVotes.style || descriptionInput.trim() || instagramInput.trim()
          ? "투표는 바로 반영되고 스타일·설명·인스타그램은 관리자 승인 후 표시됩니다."
          : "투표가 바로 반영되었습니다.",
      );
    } catch (error) {
      Alert.alert("제보 등록 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    } finally {
      setSubmittingParticipation(false);
    }
  }

  function changeDraftVote(type: ParticipationVoteType, value: string) {
    setDraftVotes((current) => {
      if (current[type] !== value) return { ...current, [type]: value };
      const next = { ...current };
      delete next[type];
      return next;
    });
  }

  async function pickAndUploadPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("권한 필요", "사진을 추가하려면 사진 접근 권한이 필요합니다.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (result.canceled) return;
      const nextPhoto = await uploadStorePhoto({ store: activeStore, kakaoPlace, imageUri: result.assets[0].uri });
      if (nextPhoto) setPhotos((items) => [nextPhoto, ...items]);
      Alert.alert("사진 제보 완료", "사진은 관리자 승인 후 공개됩니다.");
    } catch (error) {
      Alert.alert("사진 업로드 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    }
  }

  async function toggleSave() {
    try {
      const result = await toggleSavedStore({ store, kakaoPlace, saved });
      setSaved(result.saved);
    } catch (error) {
      Alert.alert("찜 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeStore?.coverImageUrl ? <Image source={{ uri: activeStore.coverImageUrl }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <Text style={styles.eyebrow}>{area} · {storeType}</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.address}>{address}</Text>
      {isKakaoPlace && !activeStore ? <Text style={styles.source}>아직 스타일 정보가 부족해요. 첫 번째로 제보해보세요.</Text> : null}
      <Pressable onPress={toggleSave} style={[styles.saveButton, saved ? styles.saveButtonActive : null]}>
        <Text style={[styles.saveText, saved ? styles.saveTextActive : null]}>{saved ? "찜한 매장" : "찜하기"}</Text>
      </Pressable>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>카카오맵 정보</Text>
        <Text style={styles.cardBody}>위치, 길찾기, 기본 장소 정보는 카카오맵에서 확인합니다.</Text>
        <View style={styles.actions}>
        <Pressable onPress={() => Linking.openURL(kakaoDirections)} style={styles.primary}>
          <Text style={styles.primaryText}>카카오 길찾기</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(kakaoMap)} style={styles.secondary}>
          <Text style={styles.secondaryText}>카카오맵 보기</Text>
        </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>앱 정보</Text>
      <View style={styles.metaGrid}>
        <Meta label="출처" value={isKakaoPlace ? "카카오" : "등록"} />
        <Meta label="가격" value={activeStore?.priceLabel || topVote(voteSummary.price) || "미정"} />
        <Meta label="피팅" value={activeStore ? (activeStore.fittingAvailable ? "가능" : "확인 필요") : topVote(voteSummary.comfort) || "확인 필요"} />
      </View>

      <View style={styles.tags}>
        {highlightedTags.map((tag) => (
          <Pressable key={tag} disabled={!kakaoPlace || !customTags.includes(tag)} onPress={() => kakaoPlace && removeKakaoPlaceTag(kakaoPlace.id, tag)}>
            <Text style={[styles.tag, tag === topStyle?.value ? styles.topTag : null, kakaoPlace && customTags.includes(tag) ? styles.customTag : null]}>
              {tag === topStyle?.value ? `${tag} ${topStyle.count}` : tag}
            </Text>
          </Pressable>
        ))}
      </View>
      {kakaoPlace ? (
        <View style={styles.tagEditor}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setTagInput}
            onSubmitEditing={submitTag}
            placeholder="이 매장에 붙일 태그"
            style={styles.tagInput}
            value={tagInput}
          />
          <Pressable onPress={submitTag} style={styles.tagButton}>
            <Text style={styles.tagButtonText}>추가</Text>
          </Pressable>
        </View>
      ) : null}

      <Section
        title="매장 정보"
        body={
          activeStore?.description ||
          `${name}은 카카오 장소 검색에 등록된 옷가게입니다. 주소와 위치를 기준으로 지도에서 확인할 수 있고, 카카오맵에서 영업 정보와 방문자 정보를 이어서 볼 수 있습니다.`
        }
      />
      <Section title="추천 대상" body={activeStore?.recommendation || "근처에서 옷가게를 빠르게 찾고 싶은 사용자에게 추천합니다."} />
      <Section title="방문 전 체크" body={activeStore?.visitChecklist || "방문 전 카카오맵에서 영업시간, 휴무일, 최신 리뷰를 한 번 더 확인해보세요."} />
      {activeStore?.instagramUrl ? (
        <Pressable onPress={() => Linking.openURL(activeStore.instagramUrl!)} style={styles.instagramButton}>
          <Text style={styles.secondaryText}>Instagram 보기</Text>
        </Pressable>
      ) : null}
      {activeStore ? <Section title="관리자 코멘트" body={activeStore.editorComment || "아직 큐레이션 코멘트가 없습니다."} /> : null}
      <VoteSummaryView summary={voteSummary} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>사용자 참여</Text>
        <Pressable onPress={() => setShowVoteForm((value) => !value)} style={styles.primaryWide}>
          <Text style={styles.primaryText}>스타일 제보하기</Text>
        </Pressable>
        {showVoteForm ? (
          <VoteForm
            description={descriptionInput}
            instagramUrl={instagramInput}
            onChangeDescription={setDescriptionInput}
            onChangeInstagramUrl={setInstagramInput}
            onChangeVote={changeDraftVote}
            onSubmit={submitParticipation}
            selected={draftVotes}
            submitting={submittingParticipation}
          />
        ) : null}
        <Pressable onPress={pickAndUploadPhoto} style={styles.secondaryWide}>
          <Text style={styles.secondaryText}>사진 추가하기</Text>
        </Pressable>
      </View>

      {photos.length ? (
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>사진</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoWrap}>
                <Image source={{ uri: photo.imageUrl }} style={styles.photo} />
                {photo.status !== "approved" ? <Text style={styles.pendingBadge}>승인 대기</Text> : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {store && role === "admin" ? (
        <Pressable onPress={() => navigation.navigate("StoreForm", { store })} style={styles.editButton}>
          <Text style={styles.editText}>관리자 수정</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function topVote(values: Record<string, number>) {
  const top = getTopVote(values);
  return top ? `${top.value} ${top.count}` : "";
}

function getTopVote(values: Record<string, number>) {
  const top = Object.entries(values).sort((a, b) => b[1] - a[1])[0];
  return top ? { value: top[0], count: top[1] } : null;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

type VoteFormProps = {
  selected: Partial<Record<ParticipationVoteType, string>>;
  description: string;
  instagramUrl: string;
  submitting: boolean;
  onChangeVote: (voteType: ParticipationVoteType, voteValue: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeInstagramUrl: (value: string) => void;
  onSubmit: () => void;
};

function VoteForm({ selected, description, instagramUrl, submitting, onChangeVote, onChangeDescription, onChangeInstagramUrl, onSubmit }: VoteFormProps) {
  return (
    <View style={styles.voteForm}>
      <Text style={styles.voteHelp}>모두 선택 사항이에요. 원하는 항목만 고른 뒤 등록하세요.</Text>
      <VoteButtons title="스타일 (승인 후 반영)" type="style" values={["힙", "러블리", "미니멀", "빈티지", "스트릿"]} selected={selected.style} onVote={onChangeVote} />
      <VoteButtons title="크기" type="size" values={["작음", "보통", "큼"]} selected={selected.size} onVote={onChangeVote} />
      <VoteButtons title="가격대" type="price" values={["저렴", "보통", "비쌈"]} selected={selected.price} onVote={onChangeVote} />
      <VoteButtons title="구경 편의성" type="comfort" values={["편함", "보통", "불편"]} selected={selected.comfort} onVote={onChangeVote} />
      <VoteButtons title="쇼핑 만족도" type="shopping" values={["좋음", "보통", "아쉬움"]} selected={selected.shopping} onVote={onChangeVote} />
      <TextInput value={description} onChangeText={onChangeDescription} placeholder="긴 설명 제보 (선택, 승인 후 반영)" style={styles.contributionInput} multiline />
      <TextInput autoCapitalize="none" value={instagramUrl} onChangeText={onChangeInstagramUrl} placeholder="인스타 URL 제보 (선택, 승인 후 반영)" style={styles.contributionInput} />
      <Pressable disabled={submitting} onPress={onSubmit} style={[styles.submitParticipation, submitting ? styles.disabledButton : null]}>
        <Text style={styles.primaryText}>{submitting ? "등록 중..." : "제보 등록"}</Text>
      </Pressable>
    </View>
  );
}

function VoteButtons({ title, type, values, selected, onVote }: { title: string; type: ParticipationVoteType; values: string[]; selected?: string; onVote: (voteType: ParticipationVoteType, voteValue: string) => void }) {
  return (
    <View style={styles.voteGroup}>
      <Text style={styles.voteTitle}>{title}</Text>
      <View style={styles.voteButtons}>
        {values.map((value) => (
          <Pressable key={value} onPress={() => onVote(type, value)} style={[styles.voteButton, selected === value ? styles.voteButtonSelected : null]}>
            <Text style={[styles.voteButtonText, selected === value ? styles.voteButtonTextSelected : null]}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function VoteSummaryView({ summary }: { summary: VoteSummary }) {
  const labels: Record<ParticipationVoteType, string> = {
    style: "스타일",
    size: "크기",
    price: "가격대",
    comfort: "구경 편의성",
    shopping: "쇼핑 만족도",
  };

  return (
    <View style={styles.voteSummary}>
      <Text style={styles.sectionTitle}>투표 요약</Text>
      {(["style", "size", "price", "comfort", "shopping"] as ParticipationVoteType[]).map((type) => (
        <VoteSummaryGroup key={type} label={labels[type]} values={summary[type]} />
      ))}
    </View>
  );
}

function VoteSummaryGroup({ label, values }: { label: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const top = entries[0]?.[0];

  return (
    <View style={styles.voteSummaryGroup}>
      <Text style={styles.voteSummaryTitle}>{label}</Text>
      {entries.length ? (
        entries.map(([value, count]) => {
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <View key={value} style={styles.voteResult}>
              <View style={styles.voteResultHeader}>
                <Text style={[styles.voteResultLabel, value === top ? styles.voteResultTopLabel : null]}>{value}</Text>
                <Text style={styles.voteResultCount}>{count}명 · {percent}%</Text>
              </View>
              <View style={styles.voteBarTrack}>
                <View style={[styles.voteBarFill, value === top ? styles.voteBarFillTop : null, { width: `${percent}%` }]} />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.voteEmpty}>아직 투표 없음</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  address: {
    color: "#766b5e",
    fontWeight: "700",
    marginTop: 4,
  },
  container: {
    backgroundColor: "#f4eadc",
  },
  content: {
    padding: 16,
  },
  cover: {
    borderRadius: 8,
    height: 220,
    width: "100%",
  },
  coverFallback: {
    backgroundColor: "#dce9e1",
    borderRadius: 8,
    height: 220,
  },
  cardBody: {
    color: "#766b5e",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  cardTitle: {
    color: "#171512",
    fontSize: 17,
    fontWeight: "900",
  },
  contributionInput: {
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contributionRow: {
    flexDirection: "row",
    gap: 8,
  },
  customTag: {
    backgroundColor: "#eaf4ff",
    color: "#246397",
  },
  editButton: {
    alignItems: "center",
    borderColor: "#171512",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  editText: {
    color: "#171512",
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.55,
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  eyebrow: {
    color: "#c25263",
    fontWeight: "900",
    marginTop: 16,
  },
  instagramButton: {
    alignItems: "center",
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  meta: {
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  metaLabel: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "800",
  },
  metaValue: {
    color: "#171512",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: "rgba(32,32,30,0.82)",
    borderRadius: 6,
    bottom: 6,
    color: "white",
    fontSize: 11,
    fontWeight: "900",
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: "absolute",
  },
  photo: {
    borderRadius: 8,
    height: 110,
    width: 110,
  },
  photoRow: {
    gap: 8,
  },
  photoWrap: {
    position: "relative",
  },
  primary: {
    backgroundColor: "#2f7b6d",
    borderRadius: 8,
    flex: 1,
    padding: 14,
  },
  primaryText: {
    color: "white",
    fontWeight: "900",
    textAlign: "center",
  },
  primaryWide: {
    alignItems: "center",
    backgroundColor: "#2f7b6d",
    borderRadius: 8,
    padding: 13,
  },
  secondary: {
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  secondaryText: {
    color: "#171512",
    fontWeight: "900",
    textAlign: "center",
  },
  saveButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveButtonActive: {
    backgroundColor: "#171512",
    borderColor: "#171512",
  },
  saveText: {
    color: "#171512",
    fontWeight: "900",
  },
  saveTextActive: {
    color: "#fffaf3",
  },
  secondaryWide: {
    alignItems: "center",
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    padding: 13,
  },
  source: {
    color: "#2f7b6d",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  submitParticipation: {
    alignItems: "center",
    backgroundColor: "#171512",
    borderRadius: 8,
    padding: 14,
  },
  section: {
    borderTopColor: "#d8c7b2",
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 16,
  },
  sectionCard: {
    backgroundColor: "#fffaf1",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
    padding: 14,
  },
  sectionBody: {
    color: "#766b5e",
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: "#171512",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 7,
  },
  tag: {
    backgroundColor: "#e5f0ea",
    borderRadius: 8,
    color: "#235d52",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  topTag: {
    backgroundColor: "#171512",
    color: "#fffaf3",
  },
  tagButton: {
    alignItems: "center",
    backgroundColor: "#171512",
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  tagButtonText: {
    color: "white",
    fontWeight: "900",
  },
  tagEditor: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  tagInput: {
    backgroundColor: "#fffaf3",
    borderColor: "#d8c7b2",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14,
  },
  voteButton: {
    backgroundColor: "#e5f0ea",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voteButtonText: {
    color: "#235d52",
    fontSize: 12,
    fontWeight: "900",
  },
  voteButtonSelected: {
    backgroundColor: "#2f7b6d",
  },
  voteButtonTextSelected: {
    color: "white",
  },
  voteButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  voteForm: {
    gap: 12,
  },
  voteHelp: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "700",
  },
  voteGroup: {
    gap: 7,
  },
  voteSummary: {
    gap: 12,
    marginTop: 14,
  },
  voteSummaryGroup: {
    gap: 8,
  },
  voteSummaryTitle: {
    color: "#171512",
    fontSize: 13,
    fontWeight: "900",
  },
  voteResult: {
    gap: 5,
  },
  voteResultHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  voteResultLabel: {
    color: "#766b5e",
    fontSize: 13,
    fontWeight: "800",
  },
  voteResultTopLabel: {
    color: "#171512",
    fontWeight: "900",
  },
  voteResultCount: {
    color: "#766b5e",
    fontSize: 12,
    fontWeight: "800",
  },
  voteBarTrack: {
    backgroundColor: "#eadfcc",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  voteBarFill: {
    backgroundColor: "#8db8aa",
    borderRadius: 999,
    height: "100%",
  },
  voteBarFillTop: {
    backgroundColor: "#2f7b6d",
  },
  voteEmpty: {
    color: "#766b5e",
    fontSize: 13,
    fontWeight: "700",
  },
  voteTitle: {
    color: "#171512",
    fontSize: 13,
    fontWeight: "900",
  },
  title: {
    color: "#171512",
    fontSize: 31,
    fontWeight: "900",
  },
});
