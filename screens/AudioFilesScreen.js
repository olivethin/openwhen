// screens/AudioFilesScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; // (kept as-is per your code)
import { Audio } from "expo-av"; // (kept as-is)
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../supabase/supabase";

export default function AudioFilesScreen({ route }) {
  const { capsule } = route.params;
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [statusText, setStatusText] = useState(""); // tracks play/pause

  // Configure iOS audio
  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
    };
    setupAudio();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  // Fetch audio files
  const fetchAudioFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audios")
        .select("*")
        .eq("capsule_id", capsule.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAudioFiles(data || []);
    } catch (err) {
      Alert.alert("Error fetching files", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  // Pick & upload audio
  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) throw new Error("No file selected");

      // reject invalid file types
      if (!file.name.match(/\.(mp3|wav|m4a)$/i)) {
        Alert.alert(
          "Invalid file",
          "Only audio files are supported (mp3, wav, m4a)."
        );
        return;
      }

      setLoading(true);

      // Get session user
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error("No user session found");

      // Read as base64 (kept as-is with your current code)
      const fileBase64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });
      const byteArray = Uint8Array.from(atob(fileBase64), (c) =>
        c.charCodeAt(0)
      );

      const storagePath = `audio/${capsule.id}/${file.name}`;

      // Upload
      const { error: uploadError } = await supabase.storage
        .from("capsules")
        .upload(storagePath, byteArray, { upsert: true });
      if (uploadError) throw uploadError;

      // Get URL
      const { data: urlData } = supabase.storage
        .from("capsules")
        .getPublicUrl(storagePath);
      const fileUrl = urlData.publicUrl;

      // Insert DB row
      const { error: insertError } = await supabase.from("audios").insert([
        {
          capsule_id: capsule.id,
          user_id: user.id,
          file_url: fileUrl,
          storage_path: storagePath,
        },
      ]);
      if (insertError) throw insertError;

      Alert.alert("✅ Success", "Audio uploaded!");
      fetchAudioFiles();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Play/pause toggle
  const playAudio = async (url) => {
    try {
      if (sound && statusText === "Playing") {
        await sound.pauseAsync();
        setStatusText("Paused");
        return;
      }
      if (sound && statusText === "Paused") {
        await sound.playAsync();
        setStatusText("Playing");
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setStatusText("Playing");

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setStatusText("Stopped");
          setSound(null);
        }
      });
    } catch (err) {
      Alert.alert("Playback error", err.message);
    }
  };

  // Delete
  const deleteAudio = async (item) => {
    Alert.alert("Delete Audio", "Are you sure you want to delete this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            setLoading(true);
            await supabase.storage.from("capsules").remove([item.storage_path]);
            await supabase.from("audios").delete().eq("id", item.id);
            setAudioFiles((prev) => prev.filter((a) => a.id !== item.id));
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
    <TouchableOpacity
      style={styles.fileItem}
      onPress={() => playAudio(item.file_url)}
      onLongPress={() => deleteAudio(item)}
    >
      <Text style={styles.fileName}>{item.file_url.split("/").pop()}</Text>
      <Text style={styles.fileHint}>{statusText || "Tap to Play (hold to delete)"}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={["#FDF6E3", "#7FB3D5"]} // beige → pastel blue (matches CapsuleList)
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header to match CapsuleList */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Audio Files</Text>
        </View>

        {/* White card container, like CapsuleList content area */}
        <View style={styles.containerCard}>
          <TouchableOpacity style={styles.primaryBtn} onPress={pickAudioFile} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FDF6E3" />
            ) : (
              <Text style={styles.primaryBtnText}>+ Upload Audio</Text>
            )}
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#7FB3D5" />
            </View>
          ) : (
            <FlatList
              data={audioFiles}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Top header like CapsuleList
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

  // White card shell similar to CapsuleList’s content container
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

  // Upload button (same blue)
  primaryBtn: {
    backgroundColor: "#7FB3D5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#FDF6E3", fontWeight: "700", fontSize: 16 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  // List item card (light blue, rounded)
  fileItem: {
    padding: 12,
    backgroundColor: "#E0F0FF",
    borderRadius: 12,
    marginBottom: 10,
  },
  fileName: { fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  fileHint: { color: "#475569" },
});
