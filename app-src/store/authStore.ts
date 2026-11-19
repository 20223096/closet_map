import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { supabase } from "../lib/supabase";
import type { Profile } from "../types/domain";

type AuthState = {
  loading: boolean;
  rememberSession: boolean;
  session: Session | null;
  profile: Profile | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  setRememberSession: (remember: boolean) => Promise<void>;
};

const REMEMBER_SESSION_KEY = "closet-map:remember-session";

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  rememberSession: false,
  session: null,
  profile: null,
  bootstrap: async () => {
    if (!supabase) {
      set({
        loading: false,
        profile: { id: "local-admin", email: "local@closet.map", nickname: "Local Admin", role: "admin" },
      });
      return;
    }

    const rememberSession = (await AsyncStorage.getItem(REMEMBER_SESSION_KEY)) === "true";
    const { data } = await supabase.auth.getSession();
    if (data.session && !rememberSession) {
      await supabase.auth.signOut();
      set({ loading: false, rememberSession, session: null, profile: null });
      return;
    }
    set({ session: data.session, rememberSession });
    await get().reloadProfile();
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      get().reloadProfile();
    });
    set({ loading: false });
  },
  signIn: async (email, password) => {
    if (!supabase) return;
    await AsyncStorage.setItem(REMEMBER_SESSION_KEY, String(get().rememberSession));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session });
    await get().reloadProfile();
  },
  signUp: async (email, password, nickname) => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        nickname,
        role: "user",
      });
    }
  },
  signOut: async () => {
    if (!supabase) {
      set({ session: null, profile: null });
      return;
    }
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
  setRememberSession: async (rememberSession) => {
    set({ rememberSession });
    await AsyncStorage.setItem(REMEMBER_SESSION_KEY, String(rememberSession));
  },
  reloadProfile: async () => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ profile: null });
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
    if (data) {
      set({
        profile: {
          id: data.id,
          email: data.email,
          nickname: data.nickname,
          role: data.role,
        },
      });
      return;
    }

    const fallbackProfile: Profile = {
      id: userData.user.id,
      email: userData.user.email ?? "",
      nickname: userData.user.email?.split("@")[0] ?? null,
      role: "user",
    };
    await supabase.from("profiles").upsert(fallbackProfile);
    set({ profile: fallbackProfile });
  },
}));
