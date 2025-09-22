//ImagesFilesScreen
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
import * as FileSystem from "expo-file-system/legacy"; 
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

  // Upload image
  const pickAndUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) throw new Error("No image selected");

      const fileUri = asset.uri;
      const fileName = fileUri.split("/").pop();
      const storagePath = `${capsule.id}/${fileName}`; // ✅ needed for deletion

      setLoading(true);

      // Get user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData?.user) throw new Error("User not logged in");
      const userId = userData.user.id;

      if (!capsule?.id) throw new Error("Capsule ID missing");

      // Read file → bytes
      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });
      const byteArray = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("capsules")
        .upload(storagePath, byteArray, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("capsules")
        .getPublicUrl(storagePath);
      const fileUrl = urlData.publicUrl;

      // Insert into DB with storage_path
      const { error: tableError } = await supabase.from("images").insert([
        {
          capsule_id: capsule.id,
          user_id: userId,
          file_url: fileUrl,
          storage_path: storagePath, // ✅ now saved
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

            // Delete from storage
            const { error: storageError } = await supabase.storage
              .from("capsules")
              .remove([item.storage_path]);
            if (storageError) throw storageError;

            // Delete from table
            const { error: tableError } = await supabase
              .from("images")
              .delete()
              .eq("id", item.id);
            if (tableError) throw tableError;

            // Remove from UI
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

  // Render each image
  const renderItem = ({ item }) => (
    <TouchableOpacity onLongPress={() => deleteImage(item)}>
      <Image source={{ uri: item.file_url }} style={styles.image} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickAndUploadImage}>
        <Text style={styles.buttonText}>Upload Image</Text>
      </TouchableOpacity>

      {loading && (
        <ActivityIndicator size="large" color="#7FB3D5" style={{ marginTop: 20 }} />
      )}

      <FlatList
        data={images}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        horizontal
        contentContainerStyle={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FDF6E3" },
  button: {
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  image: { width: 150, height: 150, borderRadius: 8, marginRight: 10 },
});
