import MapView, { Marker } from "react-native-maps";

import type { KakaoPlace } from "../types/domain";
import type { Store } from "../types/domain";

type Props = {
  center: { lat: number; lng: number };
  kakaoPlaces?: KakaoPlace[];
  onKakaoPlacePress?: (place: KakaoPlace) => void;
  stores: Store[];
  onStorePress: (store: Store) => void;
  style: object;
};

export function StoreMap({ center, kakaoPlaces = [], onKakaoPlacePress, stores, onStorePress, style }: Props) {
  return (
    <MapView
      style={style}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      }}
      region={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      }}
      showsUserLocation
    >
      {stores.map((store) => (
        <Marker
          key={store.id}
          coordinate={{ latitude: store.lat, longitude: store.lng }}
          title={store.name}
          description={store.address}
          onCalloutPress={() => onStorePress(store)}
        />
      ))}
      {kakaoPlaces.map((place) => (
        <Marker
          key={`kakao-${place.id}`}
          coordinate={{ latitude: place.lat, longitude: place.lng }}
          description={place.roadAddressName || place.addressName}
          pinColor="#3e8f7b"
          title={place.placeName}
          onCalloutPress={() => onKakaoPlacePress?.(place)}
        />
      ))}
    </MapView>
  );
}
