//CapsuleListScreen
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase/supabase";

export default function CapsuleListScreen({ navigation }) {
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchCapsules = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        Alert.alert("No session found. Please sign in again.");
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
      Alert.alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCapsules();
    }, [])
  );

  // 📝 Update capsule title
  const updateCapsule = async (id) => {
    try {
      const { error } = await supabase
        .from("capsules")
        .update({ title: editingTitle })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      setEditingTitle("");
      fetchCapsules();
    } catch (err) {
      Alert.alert("Update failed", err.message);
    }
  };

  // 🗑 Delete capsule
  const deleteCapsule = async (id) => {
    Alert.alert("Delete Capsule", "Are you sure you want to delete this capsule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("capsules")
              .delete()
              .eq("id", id);

            if (error) throw error;
            setCapsules((prev) => prev.filter((c) => c.id !== id));
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.capsuleItem}>
      {editingId === item.id ? (
        <>
          <TextInput
            style={styles.input}
            value={editingTitle}
            onChangeText={setEditingTitle}
            placeholder="Edit title..."
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => updateCapsule(item.id)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingId(null);
                setEditingTitle("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() =>
              navigation.navigate("CapsuleDetail", { capsule: item })
            }
          >
            <Text style={styles.capsuleTitle}>{item.title}</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => {
                setEditingId(item.id);
                setEditingTitle(item.title);
              }}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteCapsule(item.id)}>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7FB3D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {capsules.length === 0 ? (
        <Text>No capsules yet. Create one!</Text>
      ) : (
        <FlatList
          data={capsules}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("CreateCapsule")}
      >
        <Text style={styles.addButtonText}>+ New Capsule</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF6E3", padding: 20 },
  capsuleItem: {
    width: "100%",
    backgroundColor: "#E0F0FF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  capsuleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#7FB3D5",
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 15 },
  actionText: { color: "#007BFF", fontSize: 14 },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 6,
    borderRadius: 6,
  },
  saveButtonText: { color: "#fff", fontSize: 14 },
  cancelButton: {
    backgroundColor: "#aaa",
    padding: 6,
    borderRadius: 6,
  },
  cancelButtonText: { color: "#fff", fontSize: 14 },
  addButton: {
    width: "100%",
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  addButtonText: {
    color: "#FDF6E3",
    fontSize: 16,
    fontWeight: "bold",
  },
});
