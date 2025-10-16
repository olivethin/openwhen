// screens/ImageMessagesScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../supabase/supabase";

export default function ImageMessagesScreen({ route }) {
  const { capsule } = route.params;
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingCaption, setEditingCaption] = useState("");

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required","Camera roll permissions are needed to upload images.");
      }
    })();
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("capsule_id", capsule.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setImages(data || []);
    } catch (err) {
      Alert.alert("Failed to fetch images", err.message);
    }
  };

  const askForCaption = (suggested = "") =>
    new Promise((resolve) => {
      if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
        Alert.prompt(
          "Add a caption",
          "Enter a caption for this image",
          [
            { text: "Skip", style: "cancel", onPress: () => resolve("") },
            { text: "Save", onPress: (t) => resolve((t || "").trim()) },
          ],
          "plain-text",
          suggested
        );
      } else {
        resolve("");
      }
    });

  const pickAndUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 1,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) throw new Error("No file selected");
      if (asset.type === "video") {
        Alert.alert("Invalid file", "Videos are not allowed. Please select an image.");
        return;
      }

      const fileUri = asset.uri;
      const fileName = fileUri.split("/").pop();
      const storagePath = `${capsule.id}/${fileName}`;
      const userCaption = await askForCaption("");

      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData?.user) throw new Error("User not logged in");
      const userId = userData.user.id;

      if (!capsule?.id) throw new Error("Capsule ID missing");

      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: "base64" });
      const byteArray = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("capsules")
        .upload(storagePath, byteArray, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("capsules").getPublicUrl(storagePath);
      const fileUrl = urlData.publicUrl;

      let insertErr = null;
      const { error: insertWithCaptionErr } = await supabase.from("images").insert([
        {
          capsule_id: capsule.id,
          user_id: userId,
          file_url: fileUrl,
          storage_path: storagePath,
          display_caption: userCaption,
        },
      ]);
      insertErr = insertWithCaptionErr;

      if (insertErr && /column .*display_caption/i.test(insertErr.message)) {
        const { error: insertNoCaptionErr } = await supabase.from("images").insert([
          { capsule_id: capsule.id, user_id: userId, file_url: fileUrl, storage_path: storagePath },
        ]);
        if (insertNoCaptionErr) throw insertNoCaptionErr;
        Alert.alert("Uploaded (without caption)","To save captions, add a 'display_caption text' column to the 'images' table.");
      }

      fetchImages();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingCaption(item.display_caption || "");
  };

  const saveCaption = async (itemId) => {
    try {
      const { error } = await supabase.from("images").update({ display_caption: editingCaption }).eq("id", itemId);
      if (error) throw error;
      setImages((prev) => prev.map((img) => (img.id === itemId ? { ...img, display_caption: editingCaption } : img)));
      setEditingId(null);
      setEditingCaption("");
    } catch (err) {
      if (/column .*display_caption/i.test(err.message)) {
        Alert.alert("Add column required","Please add 'display_caption text' to the 'images' table to enable captions.");
      } else {
        Alert.alert("Save failed", err.message);
      }
    }
  };

  const deleteImage = async (item) => {
    Alert.alert("Delete Image", "Do you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const { error: storageError } = await supabase.storage.from("capsules").remove([item.storage_path]);
            if (storageError) throw storageError;
            const { error: tableError } = await supabase.from("images").delete().eq("id", item.id);
            if (tableError) throw tableError;
            setImages((prev) => prev.filter((img) => img.id !== item.id));
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isEditing = editingId === item.id;
    return (
      <View style={styles.card}>
        <Image source={{ uri: item.file_url }} style={styles.cardImage} />
        {isEditing ? (
          <>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption…"
              placeholderTextColor="#94a3b8"
              value={editingCaption}
              onChangeText={setEditingCaption}
            />
            <View style={styles.row}>
              <TouchableOpacity style={styles.primaryChip} onPress={() => saveCaption(item.id)}>
                <Feather name="check" size={14} color="#FDF6E3" />
                <Text style={styles.primaryChipText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostChip}
                onPress={() => {
                  setEditingId(null);
                  setEditingCaption("");
                }}
              >
                <Feather name="x" size={14} color="#0f172a" />
                <Text style={styles.ghostChipText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.captionText}>{item.display_caption || "No caption yet"}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.actionChip} onPress={() => startEdit(item)}>
                <Feather name="edit-2" size={14} color="#7FB3D5" />
                <Text style={styles.actionChipText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteChip} onPress={() => deleteImage(item)}>
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
    <LinearGradient colors={["#FDF6E3", "#7FB3D5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Compact header (text only) */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Image Files</Text>
        </View>

        {/* Big decorative image (independent from header) */}
        <View pointerEvents="none" style={styles.heroImageWrap}>
          <Image source={require("../assets/boo.png")} style={styles.heroImage} resizeMode="contain" />
        </View>

        {/* White card container */}
        <View style={styles.containerCard}>
          <TouchableOpacity style={styles.primaryBtn} onPress={pickAndUploadImage} disabled={loading}>
            {loading ? <ActivityIndicator color="#FDF6E3" /> : <Text style={styles.primaryBtnText}>+ Upload Image</Text>}
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#7FB3D5" />
            </View>
          )}

          <FlatList
            data={images}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
          />
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

  // Large independent image
  heroImageWrap: {
    position: "absolute",
    top: 6,
    right: 16,
    zIndex: 0,
    opacity: 1,
  },
  heroImage: {
    width: 180,   // ⬅️ bigger image
    height: 180,
  },

  containerCard: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0F0FF",
  },

  primaryBtn: {
    backgroundColor: "#7FB3D5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#FDF6E3", fontWeight: "700", fontSize: 16 },

  loadingWrap: { alignItems: "center", justifyContent: "center", marginTop: 8 },

  card: {
    backgroundColor: "#F8FAFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    padding: 12,
    marginBottom: 12,
  },
  cardImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#E0F0FF",
  },

  captionText: { marginTop: 10, fontSize: 14, color: "#1f2937" },
  captionInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    color: "#0f172a",
    fontSize: 14,
  },

  row: { flexDirection: "row", gap: 8, marginTop: 10 },

  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E0F0FF",
  },
  actionChipText: { fontSize: 13, color: "#1f2937", fontWeight: "600" },

  deleteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FADADD",
  },
  deleteChipText: { fontSize: 13, color: "#E75480", fontWeight: "600" },

  primaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#7FB3D5",
  },
  primaryChipText: { fontSize: 13, color: "#FDF6E3", fontWeight: "700" },

  ghostChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  ghostChipText: { fontSize: 13, color: "#0f172a", fontWeight: "700" },
});
