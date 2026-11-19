import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AdminStoresScreen } from "../screens/AdminStoresScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { DuplicateManagerScreen } from "../screens/DuplicateManagerScreen";
import { MapScreen } from "../screens/MapScreen";
import { SavedStoresScreen } from "../screens/SavedStoresScreen";
import { StoreDetailScreen } from "../screens/StoreDetailScreen";
import { StoreFormScreen } from "../screens/StoreFormScreen";
import { useAuthStore } from "../store/authStore";
import type { MainTabParamList, RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const isAdmin = useAuthStore((state) => state.profile?.role === "admin");

  return (
    <Tabs.Navigator
      initialRouteName={isAdmin ? "Admin" : "Map"}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#20201e",
        tabBarInactiveTintColor: "#77736a",
      }}
    >
      <Tabs.Screen name="Map" component={MapScreen} options={{ title: "지도" }} />
      <Tabs.Screen name="Saved" component={SavedStoresScreen} options={{ title: "찜" }} />
      {isAdmin ? (
        <>
          <Tabs.Screen name="Admin" component={AdminStoresScreen} options={{ title: "관리" }} />
          <Tabs.Screen name="Duplicates" component={DuplicateManagerScreen} options={{ title: "중복" }} />
        </>
      ) : null}
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const profile = useAuthStore((state) => state.profile);

  return (
    <Stack.Navigator>
      {!profile ? (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="StoreDetail" component={StoreDetailScreen} options={{ title: "매장 상세" }} />
          <Stack.Screen name="StoreForm" component={StoreFormScreen} options={{ title: "매장 등록/수정" }} />
        </>
      )}
    </Stack.Navigator>
  );
}
