// screens/WrittenMessages.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../supabase/supabase";

export default function WrittenMessagesScreen({ route }) {
  const { capsule } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("written_messages")
        .select("*")
        .eq("capsule_id", capsule.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [capsule.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Add message
  const saveMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    try {
      setSaving(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) throw new Error("No session found");

      const { error } = await supabase.from("written_messages").insert([
        {
          capsule_id: capsule.id,
          user_id: session.user.id,
          message: text,
        },
      ]);

      if (error) throw error;

      setNewMessage("");
      fetchMessages();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update message
  const updateMessage = async (id) => {
    const text = editingText.trim();
    if (!text) {
      Alert.alert("Message required", "Please enter some text.");
      return;
    }
    try {
      const { error } = await supabase
        .from("written_messages")
        .update({ message: text })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      setEditingText("");
      fetchMessages();
    } catch (err) {
      Alert.alert("Update failed", err.message);
    }
  };

  // Delete message
  const deleteMessage = async (id) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("written_messages")
              .delete()
              .eq("id", id);

            if (error) throw error;
            setMessages((prev) => prev.filter((m) => m.id !== id));
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isEditing = editingId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="document-text-outline" size={18} color="#7FB3D5" />
          </View>
          <Text style={styles.dateText}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>

        {isEditing ? (
          <>
            <TextInput
              style={[styles.input, { minHeight: 90 }]}
              value={editingText}
              onChangeText={setEditingText}
              placeholder="Edit message…"
              placeholderTextColor="#9aa3af"
              multiline
            />
            <View style={styles.row}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => updateMessage(item.id)}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => {
                  setEditingId(null);
                  setEditingText("");
                }}
              >
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.messageText}>{item.message}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionChip}
                onPress={() => {
                  setEditingId(item.id);
                  setEditingText(item.message);
                }}
              >
                <Feather name="edit-2" size={14} color="#7FB3D5" />
                <Text style={styles.actionChipText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteChip}
                onPress={() => deleteMessage(item.id)}
              >
                <Feather name="trash-2" size={14} color="#E75480" />
                <Text style={styles.deleteChipText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#FDF6E3", "#B3D9FF"]} // beige → softer pastel blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Compact header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Written Messages</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#7FB3D5" />
              <Text style={{ color: "#6b7280", marginTop: 8 }}>Loading…</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>✍️</Text>
                  <Text style={styles.emptyTitle}>No messages yet</Text>
                  <Text style={styles.emptyText}>Write your first message below.</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Composer */}
        <View style={styles.composerWrap}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Write a message…"
            placeholderTextColor="#94a3b8"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
            ]}
            onPress={saveMessage}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FDF6E3" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="#FDF6E3" />
                <Text style={styles.addBtnText}>Add</Text>
              </>
            )}
          </Pressable>
        </View>
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
  },

  content: {
    flex: 1,
    paddingTop: 8,
  },

  // Card (message item)
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    marginHorizontal: 16,
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
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { fontSize: 12, color: "#64748b" },

  messageText: {
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 10,
    lineHeight: 22,
  },

  // Chips row
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
    backgroundColor: "#FADADD", // pale pink
  },
  deleteChipText: {
    fontSize: 13,
    color: "#E75480", // pink text
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
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  // Composer area (fixed at bottom)
  composerWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: "#7FB3D5",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtnText: { color: "#FDF6E3", fontWeight: "700" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyWrap: { alignItems: "center", paddingTop: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  emptyText: { color: "#64748b" },
});
