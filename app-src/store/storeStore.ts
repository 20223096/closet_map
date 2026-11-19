import * as Location from "expo-location";
import { create } from "zustand";

import { listPendingReviewItems, reviewPendingItems } from "../lib/participationRepository";
import { findDuplicateStores, listStores, upsertStore } from "../lib/storeRepository";
import type { KakaoPlace, PendingReviewItem, Store, StoreUpsertInput } from "../types/domain";
import { searchKakaoPlaces } from "../lib/kakao";

type StoreState = {
  stores: Store[];
  selectedTags: string[];
  currentLocation: { lat: number; lng: number } | null;
  kakaoPlaces: KakaoPlace[];
  kakaoPlaceTags: Record<string, string[]>;
  duplicateGroups: Array<{ key: string; stores: Store[] }>;
  pendingReviewItems: PendingReviewItem[];
  loading: boolean;
  addKakaoPlaceTag: (placeId: string, tag: string) => void;
  loadStores: (includePending?: boolean) => Promise<void>;
  loadPendingReviews: () => Promise<void>;
  removeKakaoPlaceTag: (placeId: string, tag: string) => void;
  toggleTag: (tag: string) => void;
  requestCurrentLocation: () => Promise<void>;
  searchPlaces: (query: string) => Promise<void>;
  saveStore: (input: StoreUpsertInput) => Promise<Store>;
  reviewPendingGroup: (items: PendingReviewItem[], status: "approved" | "rejected") => Promise<void>;
  loadDuplicates: () => Promise<void>;
};

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  selectedTags: [],
  currentLocation: null,
  kakaoPlaces: [],
  kakaoPlaceTags: {},
  duplicateGroups: [],
  pendingReviewItems: [],
  loading: false,
  addKakaoPlaceTag: (placeId, tag) => {
    const normalizedTag = tag.trim();
    if (!normalizedTag) return;
    const currentTags = get().kakaoPlaceTags[placeId] ?? [];
    if (currentTags.includes(normalizedTag)) return;
    set({
      kakaoPlaceTags: {
        ...get().kakaoPlaceTags,
        [placeId]: [...currentTags, normalizedTag],
      },
    });
  },
  loadStores: async (includePending = false) => {
    set({ loading: true });
    try {
      set({ stores: await listStores({ includePending }) });
    } finally {
      set({ loading: false });
    }
  },
  loadPendingReviews: async () => {
    set({ pendingReviewItems: await listPendingReviewItems() });
  },
  toggleTag: (tag) => {
    const tags = get().selectedTags;
    set({ selectedTags: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag] });
  },
  removeKakaoPlaceTag: (placeId, tag) => {
    const currentTags = get().kakaoPlaceTags[placeId] ?? [];
    set({
      kakaoPlaceTags: {
        ...get().kakaoPlaceTags,
        [placeId]: currentTags.filter((item) => item !== tag),
      },
    });
  },
  requestCurrentLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const position = await Location.getCurrentPositionAsync({});
    set({
      currentLocation: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
    });
  },
  searchPlaces: async (query) => {
    set({ kakaoPlaces: await searchKakaoPlaces(query) });
  },
  saveStore: async (input) => {
    const store = await upsertStore(input);
    await get().loadStores(true);
    return store;
  },
  reviewPendingGroup: async (items, status) => {
    await reviewPendingItems(items, status);
    await get().loadPendingReviews();
    await get().loadStores(true);
  },
  loadDuplicates: async () => {
    set({ duplicateGroups: await findDuplicateStores() });
  },
}));
