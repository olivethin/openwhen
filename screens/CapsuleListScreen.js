// screens/CapsuleListScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Pressable,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../supabase/supabase";

export default function CapsuleListScreen({ navigation }) {
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [query, setQuery] = useState(""); // ← search text

  const fetchCapsules = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        Alert.alert("Session expired", "Please sign in again.");
        navigation.replace("Register");
        return;
      }
      const { data, error } = await supabase
        .from("capsules")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCapsules(data || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCapsules();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCapsules();
    setRefreshing(false);
  }, []);

  const updateCapsule = async (id) => {
    try {
      if (!editingTitle.trim()) {
        Alert.alert("Title required", "Please enter a title.");
        return;
      }
      const { error } = await supabase
        .from("capsules")
        .update({ title: editingTitle.trim() })
        .eq("id", id);
      if (error) throw error;
      setEditingId(null);
      setEditingTitle("");
      fetchCapsules();
    } catch (err) {
      Alert.alert("Update failed", err.message);
    }
  };

  const deleteCapsule = async (id) => {
    Alert.alert("Delete Capsule", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("capsules").delete().eq("id", id);
            if (error) throw error;
            setCapsules((prev) => prev.filter((c) => c.id !== id));
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";
    const isEditing = editingId === item.id;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
        ]}
        onPress={() =>
          !isEditing && navigation.navigate("CapsuleDetail", { capsule: item })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="mail-open-outline" size={18} color="#7FB3D5" />
          </View>
          <Text style={styles.dateText}>{date}</Text>
        </View>

        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Edit title…"
              placeholderTextColor="#9aa3af"
            />
            <View style={styles.row}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => updateCapsule(item.id)}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  setEditingId(null);
                  setEditingTitle("");
                }}
              >
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text numberOfLines={2} style={styles.title}>
              {item.title || "Untitled capsule"}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={() => {
                  setEditingId(item.id);
                  setEditingTitle(item.title || "");
                }}
              >
                <Feather name="edit-2" size={14} color="#7FB3D5" />
                <Text style={styles.actionChipText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteChip}
                onPress={() => deleteCapsule(item.id)}
              >
                <Feather name="trash-2" size={14} color="#E75480" />
                <Text style={styles.deleteChipText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Pressable>
    );
  };

  // simple filter by title
  const filteredCapsules = capsules.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (c.title || "").toLowerCase().includes(q);
  });

  return (
    <LinearGradient
      colors={["#FDF6E3", "#7FB3D5"]}   // beige → pastel blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Capsules</Text>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search capsules…"
              placeholderTextColor="#94a3b8"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View pointerEvents="none" style={styles.heroImageWrap}>
          <Image
            source={require("../assets/boo.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#7FB3D5" />
              <Text style={{ color: "#6b7280", marginTop: 8 }}>Loading capsules…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCapsules}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>📬</Text>
                  <Text style={styles.emptyTitle}>No capsules yet</Text>
                  <Text style={styles.emptyText}>
                    Tap the + button to create your first capsule.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
          onPress={() => navigation.navigate("CreateCapsule")}
        >
          <Ionicons name="add" size={28} color="#FDF6E3" />
        </Pressable>
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
    marginBottom: 8,
  },

  // search styles
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0f172a",
  },

  heroImageWrap: {
    position: "absolute",
    top: 6,
    right: 16,
    zIndex: 0,
    opacity: 1,
  },
  heroImage: {
    width: 140,
    height: 140,
  },

  content: {
    flex: 1,
    marginTop: -4,
    paddingTop: 4,
  },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0F0FF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  iconBadge: {
    backgroundColor: "#E0F0FF",
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { fontSize: 12, color: "#64748b" },

  title: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 10 },

  actionsRow: { flexDirection: "row", gap: 8 },

  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E0F0FF",
  },
  actionChipText: { fontSize: 13, color: "#1f2937", fontWeight: "600" },

  deleteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FADADD",
  },
  deleteChipText: {
    fontSize: 13,
    color: "#E75480",
    fontWeight: "600",
  },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  row: { flexDirection: "row", gap: 10 },

  primaryBtn: {
    backgroundColor: "#7FB3D5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#FDF6E3", fontWeight: "700" },

  ghostBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ghostBtnText: { color: "#0f172a", fontWeight: "700" },

  emptyWrap: { alignItems: "center", paddingTop: 64 },
  emptyEmoji: { fontSize: 46, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  emptyText: { color: "#64748b" },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7FB3D5",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 12,
    elevation: 4,
  },
});
