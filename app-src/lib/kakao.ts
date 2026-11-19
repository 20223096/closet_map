import { env } from "./env";
import type { KakaoPlace } from "../types/domain";

type KakaoKeywordDocument = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

export async function searchKakaoPlaces(query: string, size = 15): Promise<KakaoPlace[]> {
  if (!env.kakaoRestApiKey || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    query,
    size: String(size),
  });
  const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
    headers: {
      Authorization: `KakaoAK ${env.kakaoRestApiKey}`,
    },
  });

  if (!response.ok) {
    let message = `카카오 장소 검색에 실패했습니다. (${response.status})`;
    try {
      const errorBody = (await response.json()) as { message?: string; errorType?: string };
      if (errorBody.message || errorBody.errorType) {
        message = `${message} ${errorBody.message || errorBody.errorType}`;
      }
    } catch {
      // Keep the status-only message if Kakao does not return JSON.
    }
    throw new Error(message);
  }

  const json = (await response.json()) as { documents: KakaoKeywordDocument[] };
  return json.documents.map((item) => ({
    id: item.id,
    placeName: item.place_name,
    addressName: item.address_name,
    roadAddressName: item.road_address_name,
    lat: Number(item.y),
    lng: Number(item.x),
  }));
}
