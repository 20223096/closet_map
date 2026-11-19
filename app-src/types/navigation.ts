import type { NavigatorScreenParams } from "@react-navigation/native";

import type { KakaoPlace, Store } from "./domain";

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  StoreDetail: { storeId?: string; kakaoPlace?: KakaoPlace };
  StoreForm: { store?: Store; kakaoPlaceId?: string } | undefined;
};

export type MainTabParamList = {
  Map: undefined;
  Saved: undefined;
  Admin: undefined;
  Duplicates: undefined;
};
