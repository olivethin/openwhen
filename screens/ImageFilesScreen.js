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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy"; // kept as-is per your code
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../supabase/supabase";

export default function ImageMessagesScreen({ route }) {
  const { capsule } = route.params;
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ask for permission + fetch images
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Camera roll permissions are needed to upload images."
        );
      }
    })();
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch images from DB
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

  // Pick & upload image
  const pickAndUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // allow photos + videos
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) throw new Error("No file selected");

      // Reject videos
      if (asset.type === "video") {
        Alert.alert("Invalid file", "Videos are not allowed. Please select an image.");
        return;
      }

      const fileUri = asset.uri;
      const fileName = fileUri.split("/").pop();
      const storagePath = `${capsule.id}/${fileName}`;

      setLoading(true);

      // Get user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData?.user) throw new Error("User not logged in");
      const userId = userData.user.id;

      if (!capsule?.id) throw new Error("Capsule ID missing");

      // Read file → bytes (base64 kept as-is per your code)
      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });
      const byteArray = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("capsules")
        .upload(storagePath, byteArray, { upsert: true });
      if (uploadError) throw uploadError;

      // Public URL
      const { data: urlData } = supabase.storage
        .from("capsules")
        .getPublicUrl(storagePath);
      const fileUrl = urlData.publicUrl;

      // Insert DB
      const { error: tableError } = await supabase.from("images").insert([
        {
          capsule_id: capsule.id,
          user_id: userId,
          file_url: fileUrl,
          storage_path: storagePath,
        },
      ]);
      if (tableError) throw tableError;

      fetchImages();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Delete image
  const deleteImage = async (item) => {
    Alert.alert("Delete Image", "Do you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            // Storage
            const { error: storageError } = await supabase.storage
              .from("capsules")
              .remove([item.storage_path]);
            if (storageError) throw storageError;

            // Table
            const { error: tableError } = await supabase
              .from("images")
              .delete()
              .eq("id", item.id);
            if (tableError) throw tableError;

            // UI
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

  const renderItem = ({ item }) => (
    <TouchableOpacity onLongPress={() => deleteImage(item)} activeOpacity={0.8}>
      <Image source={{ uri: item.file_url }} style={styles.image} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={["#FDF6E3", "#7FB3D5"]} // beige → pastel blue (match CapsuleList)
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Image Files</Text>
        </View>

        {/* White card container */}
        <View style={styles.containerCard}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={pickAndUploadImage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FDF6E3" />
            ) : (
              <Text style={styles.primaryBtnText}>+ Upload Image</Text>
            )}
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
            horizontal
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
            ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Compact header like CapsuleList
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

  // White card shell
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

  // Primary blue button
  primaryBtn: {
    backgroundColor: "#7FB3D5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#FDF6E3", fontWeight: "700", fontSize: 16 },

  loadingWrap: { alignItems: "center", justifyContent: "center", marginTop: 8 },

  // Image tile
  image: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#E0F0FF",
  },
});
