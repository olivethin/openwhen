// screens/CreateCapsuleScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../supabase/supabase";

export default function CreateCapsuleScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createCapsule = async () => {
    const name = title.trim();
    if (!name) {
      Alert.alert("Title required", "Please enter a capsule title.");
      return;
    }

    try {
      setSubmitting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No session found");

      const { error } = await supabase
        .from("capsules")
        .insert([{ user_id: session.user.id, title: name }]);

      if (error) throw error;

      Alert.alert("Capsule created!");
      navigation.goBack(); // returns to CapsuleList
    } catch (err) {
      Alert.alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={["#FDF6E3", "#B3D9FF"]} // beige → soft pastel blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Compact header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Capsule</Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.label}>Capsule Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter capsule title…"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
              />
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
              onPress={createCapsule}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FDF6E3" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Capsule</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.3,
    // If you loaded Poppins like other screens:
    // fontFamily: "Poppins_700Bold",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Card container
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#FFFFFF",
  },

  primaryBtn: {
    backgroundColor: "#7FB3D5", // pastel blue
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#FDF6E3",
    fontWeight: "700",
    fontSize: 16,
  },

  secondaryBtn: {
    backgroundColor: "#FADADD", // pale pink
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#E75480", // pink text
    fontWeight: "700",
    fontSize: 16,
  },
});
