import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { hasSupabaseEnv } from "../lib/env";
import { useAuthStore } from "../store/authStore";

export function AuthScreen() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const { rememberSession, setRememberSession, signIn, signUp } = useAuthStore();

  async function submit() {
    try {
      if (mode === "signIn") {
        await signIn(email, password);
      } else {
        await signUp(email, password, nickname);
        Alert.alert("가입 완료", "이메일 확인 설정을 켠 경우 메일 인증 후 로그인해주세요.");
        setMode("signIn");
      }
    } catch (error) {
      Alert.alert("인증 오류", error instanceof Error ? error.message : "다시 시도해주세요.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.eyebrow}>성수 스타일 지도</Text>
      <Text style={styles.title}>Closet Map</Text>
      {!hasSupabaseEnv ? <Text style={styles.notice}>Supabase 환경값이 없어 로컬 관리자 모드로 실행됩니다.</Text> : null}
      <View style={styles.form}>
        {mode === "signUp" ? <TextInput value={nickname} onChangeText={setNickname} placeholder="닉네임" style={styles.input} /> : null}
        <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="이메일" style={styles.input} />
        <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="비밀번호" style={styles.input} />
        {mode === "signIn" ? (
          <Pressable onPress={() => setRememberSession(!rememberSession)} style={styles.rememberRow}>
            <View style={[styles.checkbox, rememberSession ? styles.checkboxChecked : null]}>
              {rememberSession ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.rememberText}>로그인 세션 계속 기억</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={submit} style={styles.primary}>
          <Text style={styles.primaryText}>{mode === "signIn" ? "로그인" : "회원가입"}</Text>
        </Pressable>
        <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
          <Text style={styles.switchText}>{mode === "signIn" ? "계정 만들기" : "이미 계정이 있어요"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f1e9",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  eyebrow: {
    color: "#c76573",
    fontSize: 13,
    fontWeight: "900",
  },
  form: {
    gap: 12,
    marginTop: 28,
  },
  input: {
    backgroundColor: "#fffdf8",
    borderColor: "#ded9cf",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  notice: {
    color: "#77736a",
    fontWeight: "700",
    marginTop: 12,
  },
  primary: {
    alignItems: "center",
    backgroundColor: "#3e8f7b",
    borderRadius: 8,
    padding: 15,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#9b968d",
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: "#3e8f7b",
    borderColor: "#3e8f7b",
  },
  checkmark: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },
  rememberRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  rememberText: {
    color: "#4f4b44",
    fontWeight: "700",
  },
  primaryText: {
    color: "white",
    fontWeight: "900",
  },
  switchText: {
    color: "#20201e",
    fontWeight: "800",
    textAlign: "center",
  },
  title: {
    color: "#20201e",
    fontSize: 48,
    fontWeight: "900",
  },
});
