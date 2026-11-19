export type UserRole = "user" | "owner" | "admin";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type VoteType = "style" | "size" | "price" | "shopping" | "comfort" | "instagram_match";
export type ParticipationVoteType = "style" | "size" | "price" | "shopping" | "comfort";
export type ContributionType = "description" | "instagram_url" | "new_store" | "edit_store" | "tag";

export type Store = {
  id: string;
  kakaoPlaceId?: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  area: string;
  instagramUrl?: string | null;
  storeType?: string | null;
  sizeLabel?: "작음" | "보통" | "큼" | null;
  priceLabel?: "저렴" | "보통" | "비쌈" | null;
  fittingAvailable: boolean;
  description?: string | null;
  recommendation?: string | null;
  visitChecklist?: string | null;
  editorComment?: string | null;
  coverImageUrl?: string | null;
  status: ReviewStatus;
  tags: string[];
};

export type Profile = {
  id: string;
  email: string;
  nickname?: string | null;
  role: UserRole;
};

export type KakaoPlace = {
  id: string;
  placeName: string;
  addressName: string;
  roadAddressName: string;
  lat: number;
  lng: number;
};

export type SavedPlace =
  | { kind: "store"; store: Store }
  | { kind: "kakao"; kakaoPlace: KakaoPlace };

export type StoreVote = {
  id: string;
  storeId: string;
  userId?: string | null;
  voteType: ParticipationVoteType;
  voteValue: string;
  createdAt: string;
};

export type VoteSummary = Record<ParticipationVoteType, Record<string, number>>;

export type StoreContribution = {
  id: string;
  storeId?: string | null;
  kakaoPlaceId?: string | null;
  contributionType: ContributionType;
  payload: Record<string, unknown>;
  status: ReviewStatus;
  createdBy?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
};

export type StorePhoto = {
  id: string;
  storeId: string;
  imageUrl: string;
  source: "user" | "admin" | "owner";
  status: ReviewStatus;
  createdBy?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  storeName?: string | null;
};

export type PendingReviewItem =
  | { kind: "store"; item: Store }
  | { kind: "photo"; item: StorePhoto }
  | { kind: "contribution"; item: StoreContribution };

export type StoreUpsertInput = {
  id?: string;
  kakaoPlaceId?: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  area: string;
  instagramUrl?: string | null;
  storeType?: string | null;
  sizeLabel?: Store["sizeLabel"];
  priceLabel?: Store["priceLabel"];
  fittingAvailable: boolean;
  description?: string | null;
  recommendation?: string | null;
  visitChecklist?: string | null;
  editorComment?: string | null;
  coverImageUrl?: string | null;
  status: ReviewStatus;
  tags: string[];
};
