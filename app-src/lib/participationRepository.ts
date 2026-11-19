import { ensureStoreForKakaoPlace, updateStoreStatus } from "./storeRepository";
import { supabase } from "./supabase";
import type {
  ContributionType,
  KakaoPlace,
  ParticipationVoteType,
  PendingReviewItem,
  ReviewStatus,
  SavedPlace,
  Store,
  StoreContribution,
  StorePhoto,
  VoteSummary,
} from "../types/domain";

type ContributionRow = {
  id: string;
  store_id?: string | null;
  kakao_place_id?: string | null;
  contribution_type: ContributionType;
  payload: Record<string, unknown>;
  status: ReviewStatus;
  created_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  stores?: { name?: string; address?: string } | null;
};

type PhotoRow = {
  id: string;
  store_id: string;
  image_url: string;
  source: StorePhoto["source"];
  status: ReviewStatus;
  created_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  stores?: { name?: string } | null;
};

function mapContribution(row: ContributionRow): StoreContribution {
  return {
    id: row.id,
    storeId: row.store_id,
    kakaoPlaceId: row.kakao_place_id,
    contributionType: row.contribution_type,
    payload: row.payload ?? {},
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    storeName: row.stores?.name,
    storeAddress: row.stores?.address,
  };
}

function mapPhoto(row: PhotoRow): StorePhoto {
  return {
    id: row.id,
    storeId: row.store_id,
    imageUrl: row.image_url,
    source: row.source,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    storeName: row.stores?.name,
  };
}

export async function ensureParticipationStore(input: { store?: Store | null; kakaoPlace?: KakaoPlace | null }): Promise<Store> {
  if (input.store) return input.store;
  if (!input.kakaoPlace) throw new Error("연결할 카카오 장소가 없습니다.");
  return ensureStoreForKakaoPlace(input.kakaoPlace);
}

export async function submitVote(input: {
  store?: Store | null;
  kakaoPlace?: KakaoPlace | null;
  voteType: ParticipationVoteType;
  voteValue: string;
}): Promise<Store> {
  const store = await ensureParticipationStore(input);
  if (!supabase) return store;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  const payload = {
    store_id: store.id,
    user_id: userId,
    vote_type: input.voteType,
    vote_value: input.voteValue,
  };
  if (userId) {
    const { data: existing, error: findError } = await supabase
      .from("store_votes")
      .select("id")
      .eq("store_id", store.id)
      .eq("user_id", userId)
      .eq("vote_type", input.voteType)
      .maybeSingle();
    if (findError) throw findError;
    const { error } = existing
      ? await supabase.from("store_votes").update({ vote_value: input.voteValue }).eq("id", existing.id)
      : await supabase.from("store_votes").insert(payload);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("store_votes").insert(payload);
    if (error) throw error;
  }
  return store;
}

export async function getVoteSummary(storeId: string): Promise<VoteSummary> {
  const summary: VoteSummary = {
    style: {},
    size: {},
    price: {},
    shopping: {},
    comfort: {},
  };
  if (!supabase) return summary;

  const { data, error } = await supabase.from("store_votes").select("vote_type, vote_value").eq("store_id", storeId);
  if (error) throw error;

  (data ?? []).forEach((row) => {
    const type = row.vote_type as ParticipationVoteType;
    if (!summary[type]) return;
    summary[type][row.vote_value] = (summary[type][row.vote_value] ?? 0) + 1;
  });
  return summary;
}

export async function submitContribution(input: {
  store?: Store | null;
  kakaoPlace?: KakaoPlace | null;
  contributionType: ContributionType;
  payload: Record<string, unknown>;
}): Promise<Store> {
  const store = await ensureParticipationStore(input);
  if (!supabase) return store;

  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("store_contributions").insert({
    store_id: store.id,
    kakao_place_id: store.kakaoPlaceId ?? input.kakaoPlace?.id ?? null,
    contribution_type: input.contributionType,
    payload: input.payload,
    status: "pending",
    created_by: userData.user?.id ?? null,
  });
  if (error) throw error;
  return store;
}

export async function listStorePhotos(storeId: string, includePending = false): Promise<StorePhoto[]> {
  if (!supabase) return [];
  let query = supabase.from("store_photos").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
  if (!includePending) query = query.eq("status", "approved");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapPhoto(row as PhotoRow));
}

export async function uploadStorePhoto(input: { store?: Store | null; kakaoPlace?: KakaoPlace | null; imageUri: string }): Promise<StorePhoto | null> {
  const store = await ensureParticipationStore(input);
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const extension = input.imageUri.split(".").pop()?.split("?")[0] || "jpg";
  const path = `${store.id}/${Date.now()}.${extension}`;
  const file = await fetch(input.imageUri);
  const blob = await file.blob();
  const { error: uploadError } = await supabase.storage.from("store-photos").upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from("store-photos").getPublicUrl(path);
  const { data, error } = await supabase
    .from("store_photos")
    .insert({
      store_id: store.id,
      image_url: urlData.publicUrl,
      source: "user",
      status: "pending",
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapPhoto(data as PhotoRow);
}

export async function isStoreSaved(input: { store?: Store | null; kakaoPlace?: KakaoPlace | null }): Promise<boolean> {
  if (!supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  if (!input.store && input.kakaoPlace) {
    const { data, error } = await supabase
      .from("saved_kakao_places")
      .select("id")
      .eq("kakao_place_id", input.kakaoPlace.id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  if (!input.store) return false;
  const { data, error } = await supabase
    .from("saved_stores")
    .select("id")
    .eq("store_id", input.store.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleSavedStore(input: { store?: Store | null; kakaoPlace?: KakaoPlace | null; saved: boolean }): Promise<{ store: Store; saved: boolean }> {
  if (!supabase) {
    const store = await ensureParticipationStore(input);
    return { store, saved: !input.saved };
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("로그인이 필요합니다.");

  if (!input.store && input.kakaoPlace) {
    if (input.saved) {
      const { error } = await supabase
        .from("saved_kakao_places")
        .delete()
        .eq("kakao_place_id", input.kakaoPlace.id)
        .eq("user_id", userData.user.id);
      if (error) throw error;
      return { store: kakaoPlaceToLocalStore(input.kakaoPlace), saved: false };
    }
    const { error } = await supabase.from("saved_kakao_places").upsert({
      user_id: userData.user.id,
      kakao_place_id: input.kakaoPlace.id,
      place_name: input.kakaoPlace.placeName,
      address_name: input.kakaoPlace.addressName,
      road_address_name: input.kakaoPlace.roadAddressName,
      lat: input.kakaoPlace.lat,
      lng: input.kakaoPlace.lng,
    });
    if (error) throw error;
    return { store: kakaoPlaceToLocalStore(input.kakaoPlace), saved: true };
  }

  const store = await ensureParticipationStore(input);
  if (input.saved) {
    const { error } = await supabase.from("saved_stores").delete().eq("store_id", store.id).eq("user_id", userData.user.id);
    if (error) throw error;
    return { store, saved: false };
  }

  const { error } = await supabase.from("saved_stores").upsert({
    store_id: store.id,
    user_id: userData.user.id,
  });
  if (error) throw error;
  return { store, saved: true };
}

function kakaoPlaceToLocalStore(place: KakaoPlace): Store {
  return {
    id: `kakao-${place.id}`,
    kakaoPlaceId: place.id,
    name: place.placeName,
    address: place.roadAddressName || place.addressName,
    lat: place.lat,
    lng: place.lng,
    area: "카카오",
    storeType: "옷가게",
    fittingAvailable: false,
    status: "pending",
    tags: [],
  };
}

export async function listSavedPlaces(): Promise<SavedPlace[]> {
  if (!supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const [savedStoresResult, savedKakaoResult] = await Promise.all([
    supabase.from("saved_stores").select("store_id").eq("user_id", userData.user.id),
    supabase.from("saved_kakao_places").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
  ]);
  if (savedStoresResult.error) throw savedStoresResult.error;
  if (savedKakaoResult.error) throw savedKakaoResult.error;

  const storeIds = (savedStoresResult.data ?? []).map((row) => row.store_id);
  let stores: Store[] = [];
  if (storeIds.length) {
    const { data, error } = await supabase.from("stores").select("*, store_tags(tag)").in("id", storeIds);
    if (error) throw error;
    const { mapStoreRow } = await import("./mappers");
    stores = (data ?? []).map(mapStoreRow);
  }

  return [
    ...stores.map((store) => ({ kind: "store" as const, store })),
    ...(savedKakaoResult.data ?? []).map((row) => ({
      kind: "kakao" as const,
      kakaoPlace: {
        id: row.kakao_place_id,
        placeName: row.place_name,
        addressName: row.address_name,
        roadAddressName: row.road_address_name,
        lat: row.lat,
        lng: row.lng,
      },
    })),
  ];
}

export async function listPendingReviewItems(): Promise<PendingReviewItem[]> {
  if (!supabase) return [];
  const [storesResult, photosResult, contributionsResult] = await Promise.all([
    supabase.from("stores").select("*, store_tags(tag)").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("store_photos").select("*, stores(name)").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("store_contributions").select("*, stores(name,address)").eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  if (storesResult.error) throw storesResult.error;
  if (photosResult.error) throw photosResult.error;
  if (contributionsResult.error) throw contributionsResult.error;

  const { mapStoreRow } = await import("./mappers");
  return [
    ...(storesResult.data ?? []).map((item) => ({ kind: "store" as const, item: mapStoreRow(item) })),
    ...(photosResult.data ?? []).map((item) => ({ kind: "photo" as const, item: mapPhoto(item as PhotoRow) })),
    ...(contributionsResult.data ?? []).map((item) => ({ kind: "contribution" as const, item: mapContribution(item as ContributionRow) })),
  ];
}

export async function reviewPendingItem(item: PendingReviewItem, status: ReviewStatus): Promise<void> {
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const reviewFields = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: userData.user?.id ?? null,
  };

  if (item.kind === "store") {
    await updateStoreStatus(item.item.id, status);
    return;
  }

  if (item.kind === "photo") {
    const { error } = await supabase.from("store_photos").update(reviewFields).eq("id", item.item.id);
    if (error) throw error;
    if (status === "approved") {
      await supabase.from("stores").update({ cover_image_url: item.item.imageUrl }).eq("id", item.item.storeId).is("cover_image_url", null);
    }
    return;
  }

  if (status === "approved") {
    await applyContribution(item.item);
  }
  const { error } = await supabase.from("store_contributions").update(reviewFields).eq("id", item.item.id);
  if (error) throw error;
}

export async function reviewPendingItems(items: PendingReviewItem[], status: ReviewStatus): Promise<void> {
  for (const item of items) {
    await reviewPendingItem(item, status);
  }
}

async function applyContribution(contribution: StoreContribution): Promise<void> {
  if (!supabase || !contribution.storeId) return;
  const payload = contribution.payload;

  if (contribution.contributionType === "description" && typeof payload.description === "string") {
    const { error } = await supabase.from("stores").update({ description: payload.description }).eq("id", contribution.storeId);
    if (error) throw error;
  }

  if (contribution.contributionType === "instagram_url" && typeof payload.instagramUrl === "string") {
    const { error } = await supabase.from("stores").update({ instagram_url: payload.instagramUrl }).eq("id", contribution.storeId);
    if (error) throw error;
  }

  if (contribution.contributionType === "tag" && typeof payload.tag === "string") {
    if (payload.kind === "store_tag") {
      const { error } = await supabase.from("store_tags").upsert(
        {
          store_id: contribution.storeId,
          tag: payload.tag,
          source: "user",
          confidence_score: 0.7,
        },
        { onConflict: "store_id,tag,source" },
      );
      if (error) throw error;
      return;
    }

    if (contribution.createdBy) {
      const { data: existing, error: findError } = await supabase
        .from("store_votes")
        .select("id")
        .eq("store_id", contribution.storeId)
        .eq("user_id", contribution.createdBy)
        .eq("vote_type", "style")
        .maybeSingle();
      if (findError) throw findError;
      const { error: voteError } = existing
        ? await supabase.from("store_votes").update({ vote_value: payload.tag }).eq("id", existing.id)
        : await supabase.from("store_votes").insert({
            store_id: contribution.storeId,
            user_id: contribution.createdBy,
            vote_type: "style",
            vote_value: payload.tag,
          });
      if (voteError) throw voteError;
    } else {
      const { error: voteError } = await supabase.from("store_votes").insert({
        store_id: contribution.storeId,
        user_id: null,
        vote_type: "style",
        vote_value: payload.tag,
      });
      if (voteError) throw voteError;
    }

    const { data: styleVotes, error: styleVotesError } = await supabase
      .from("store_votes")
      .select("vote_value")
      .eq("store_id", contribution.storeId)
      .eq("vote_type", "style");
    if (styleVotesError) throw styleVotesError;
    const approvedStyles = [...new Set((styleVotes ?? []).map((vote) => vote.vote_value))];

    if (approvedStyles.length) {
      const { error: tagError } = await supabase.from("store_tags").upsert(
        approvedStyles.map((tag) => ({
          store_id: contribution.storeId,
          tag,
          source: "user",
          confidence_score: 0.7,
        })),
        { onConflict: "store_id,tag,source" },
      );
      if (tagError) throw tagError;
    }
  }
}
