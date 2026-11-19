import { SAMPLE_STORES } from "./sampleStores";
import { mapStoreRow, toStoreRow } from "./mappers";
import { supabase } from "./supabase";
import type { KakaoPlace, ReviewStatus, Store, StoreUpsertInput } from "../types/domain";

export const STORE_SELECT = "*, store_tags(tag)";

export async function listStores(options: { includePending?: boolean } = {}): Promise<Store[]> {
  if (!supabase) return SAMPLE_STORES;

  let query = supabase.from("stores").select(STORE_SELECT).order("created_at", { ascending: false });
  if (!options.includePending) {
    query = query.eq("status", "approved");
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapStoreRow(row));
}

export async function upsertStore(input: StoreUpsertInput): Promise<Store> {
  if (!supabase) {
    return {
      ...input,
      id: input.id ?? `local-${Date.now()}`,
    };
  }

  if (!input.id && input.kakaoPlaceId) {
    const existing = await findStoreByKakaoPlaceId(input.kakaoPlaceId);
    if (existing) return existing;
  }

  const storeId = input.id;
  const store: Store = { ...input, id: storeId ?? "" };
  const row = toStoreRow(store);
  const { data: userData } = await supabase.auth.getUser();
  const saveResult = storeId
    ? await supabase.from("stores").update(row).eq("id", storeId).select("id").single()
    : await supabase
        .from("stores")
        .insert({
          ...(({ id: _id, ...rest }) => rest)(row),
          created_by: userData.user?.id ?? null,
        })
        .select("id")
        .single();
  const { data, error } = saveResult;
  if (error) throw error;
  const savedId = data.id as string;

  if (input.status === "pending" && !storeId && input.tags.length) {
    const { error: contributionError } = await supabase.from("store_contributions").insert(
      input.tags.map((tag) => ({
        store_id: savedId,
        contribution_type: "tag",
        payload: { tag, kind: "store_tag" },
        status: "pending",
        created_by: userData.user?.id ?? null,
      })),
    );
    if (contributionError) throw contributionError;
  } else {
    await supabase.from("store_tags").delete().eq("store_id", savedId);
  }
  if (input.status !== "pending" && input.tags.length) {
    const { error: tagError } = await supabase.from("store_tags").insert(
      input.tags.map((tag) => ({
        store_id: savedId,
        tag,
        source: "admin",
        confidence_score: 1,
      })),
    );
    if (tagError) throw tagError;
  }

  return { ...store, id: savedId };
}

export async function findStoreByKakaoPlaceId(kakaoPlaceId: string): Promise<Store | null> {
  if (!supabase) return SAMPLE_STORES.find((store) => store.kakaoPlaceId === kakaoPlaceId) ?? null;
  const { data, error } = await supabase.from("stores").select(STORE_SELECT).eq("kakao_place_id", kakaoPlaceId).maybeSingle();
  if (error) throw error;
  return data ? mapStoreRow(data) : null;
}

export async function ensureStoreForKakaoPlace(place: KakaoPlace): Promise<Store> {
  const existing = await findStoreByKakaoPlaceId(place.id);
  if (existing) return existing;

  if (!supabase) {
    return {
      id: `kakao-${place.id}`,
      kakaoPlaceId: place.id,
      name: place.placeName,
      address: place.roadAddressName || place.addressName,
      lat: place.lat,
      lng: place.lng,
      area: "카카오",
      fittingAvailable: false,
      status: "pending",
      tags: [],
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("stores")
    .insert({
      kakao_place_id: place.id,
      name: place.placeName,
      address: place.roadAddressName || place.addressName,
      lat: place.lat,
      lng: place.lng,
      area: "카카오",
      store_type: "옷가게",
      fitting_available: false,
      status: "pending",
      created_by: userData.user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    const concurrentExisting = await findStoreByKakaoPlaceId(place.id);
    if (concurrentExisting) return concurrentExisting;
    throw error;
  }

  return {
    id: data.id as string,
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

export async function updateStoreStatus(storeId: string, status: ReviewStatus): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("stores").update({ status }).eq("id", storeId);
  if (error) throw error;
}

export async function deleteStore(storeId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("stores").delete().eq("id", storeId);
  if (error) throw error;
}

export async function findDuplicateStores(): Promise<Array<{ key: string; stores: Store[] }>> {
  const stores = await listStores({ includePending: true });
  const groups = new Map<string, Store[]>();

  stores.forEach((store) => {
    const key = store.kakaoPlaceId
      ? `kakao|${store.kakaoPlaceId}`
      : `${store.name.replace(/\s+/g, "").toLowerCase()}|${store.address.slice(0, 12)}|${Math.round(store.lat * 1000)}|${Math.round(store.lng * 1000)}`;
    groups.set(key, [...(groups.get(key) ?? []), store]);
  });

  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, stores: items }));
}
