// App.js
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Auth / Account Screens
import RegisterScreen from "./screens/RegisterScreen";
import AccountScreen from "./screens/AccountScreen";
import AuthScreen from "./screens/AuthScreen";
import TestSupabaseScreen from "./screens/TestSupabaseScreen";

// Capsule Screens
import CapsuleListScreen from "./screens/CapsuleListScreen";
import CreateCapsuleScreen from "./screens/CreateCapsuleScreen";
import CapsuleDetailScreen from "./screens/CapsuleDetailScreen";
import WrittenMessagesScreen from "./screens/WrittenMessagesScreen";

// CP3 Screens
import AudioFilesScreen from "./screens/AudioFilesScreen";
import ImageFilesScreen from "./screens/ImageFilesScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Register">
        {/* Registration / Auth screen */}
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />

        {/* Account / Profile screen */}
        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{ headerShown: false }}
        />

        {/* Optional: Test Supabase connection screen */}
        <Stack.Screen
          name="TestSupabase"
          component={TestSupabaseScreen}
          options={{ headerShown: false }}
        />

        {/* Capsule Screens */}
        <Stack.Screen
          name="CapsuleList"
          component={CapsuleListScreen}
          options={{ title: "Your Capsules" }}
        />
        <Stack.Screen
          name="CreateCapsule"
          component={CreateCapsuleScreen}
          options={{ title: "New Capsule" }}
        />
        <Stack.Screen
          name="CapsuleDetail"
          component={CapsuleDetailScreen}
          options={{ title: "Capsule" }}
        />
        <Stack.Screen
          name="WrittenMessages"
          component={WrittenMessagesScreen}
          options={{ title: "Written Messages" }}
        />

        {/* CP3 Screens */}
        <Stack.Screen
          name="AudioFiles"
          component={AudioFilesScreen}
          options={{ title: "Audio Files" }}
        />
        <Stack.Screen
          name="ImageFiles"
          component={ImageFilesScreen}
          options={{ title: "Image Files" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
