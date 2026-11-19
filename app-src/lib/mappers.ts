import type { Store } from "../types/domain";

type StoreRow = Record<string, unknown> & {
  id: string;
  kakao_place_id?: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  area: string;
  instagram_url?: string | null;
  store_type?: string | null;
  size_label?: Store["sizeLabel"];
  price_label?: Store["priceLabel"];
  fitting_available?: boolean;
  description?: string | null;
  recommendation?: string | null;
  visit_checklist?: string | null;
  editor_comment?: string | null;
  cover_image_url?: string | null;
  status: Store["status"];
  store_tags?: { tag: string }[];
};

export function mapStoreRow(row: StoreRow): Store {
  return {
    id: row.id,
    kakaoPlaceId: row.kakao_place_id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    area: row.area,
    instagramUrl: row.instagram_url,
    storeType: row.store_type,
    sizeLabel: row.size_label,
    priceLabel: row.price_label,
    fittingAvailable: Boolean(row.fitting_available),
    description: row.description,
    recommendation: row.recommendation,
    visitChecklist: row.visit_checklist,
    editorComment: row.editor_comment,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    tags: row.store_tags?.map((tag) => tag.tag) ?? [],
  };
}

export function toStoreRow(store: Omit<Store, "tags">) {
  return {
    id: store.id,
    kakao_place_id: store.kakaoPlaceId,
    name: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    area: store.area,
    instagram_url: store.instagramUrl,
    store_type: store.storeType,
    size_label: store.sizeLabel,
    price_label: store.priceLabel,
    fitting_available: store.fittingAvailable,
    description: store.description,
    recommendation: store.recommendation,
    visit_checklist: store.visitChecklist,
    editor_comment: store.editorComment,
    cover_image_url: store.coverImageUrl,
    status: store.status,
  };
}
