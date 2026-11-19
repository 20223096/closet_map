import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  kakaoRestApiKey?: string;
  kakaoJavascriptKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "",
  kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || extra.kakaoRestApiKey || "",
  kakaoJavascriptKey: process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY || extra.kakaoJavascriptKey || "",
};

export const hasSupabaseEnv = Boolean(env.supabaseUrl && env.supabaseAnonKey);
