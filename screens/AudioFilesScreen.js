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
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; // kept as-is for now
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { supabase } from "../supabase/supabase";

export default function AudioFilesScreen({ route }) {
  const { capsule } = route.params;
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // playback state
  const [sound, setSound] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
        .select("*") // if display_name exists, it will be included
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

  // helper: prompt for a name (iOS native prompt; else fallback to default)
  const askForName = (suggested) =>
    new Promise((resolve) => {
      if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
        Alert.prompt(
          "Name audio",
          "Enter a display name for this audio",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
            {
              text: "Save",
              onPress: (text) => resolve((text || suggested).trim() || suggested),
            },
          ],
          "plain-text",
          suggested
        );
      } else {
        // No prompt available (Android/web Expo Go), use suggested
        resolve(suggested);
      }
    });

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

      // get a name from user (or use filename without extension)
      const baseName = file.name.replace(/\.(mp3|wav|m4a)$/i, "");
      const displayName = await askForName(baseName);
      if (displayName === null) return; // user cancelled

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

      // Insert DB row (try to save display_name; if column missing it will throw)
      let insertErr = null;
      const { error: insertError } = await supabase.from("audios").insert([
        {
          capsule_id: capsule.id,
          user_id: user.id,
          file_url: fileUrl,
          storage_path: storagePath,
          display_name: displayName, // requires column in table
        },
      ]);
      insertErr = insertError;

      // Fallback if display_name column doesn't exist
      if (insertErr && /column .*display_name/i.test(insertErr.message)) {
        // try without display_name so upload still works
        const { error: insertNoNameError } = await supabase.from("audios").insert([
          {
            capsule_id: capsule.id,
            user_id: user.id,
            file_url: fileUrl,
            storage_path: storagePath,
          },
        ]);
        if (insertNoNameError) throw insertNoNameError;

        Alert.alert(
          "Uploaded (without name)",
          "To save names, add a 'display_name text' column to the 'audios' table."
        );
      }

      fetchAudioFiles();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Play/Pause per item
  const togglePlayback = async (item) => {
    try {
      // same item and currently playing -> pause
      if (currentId === item.id && sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // same item but paused -> resume
      if (currentId === item.id && sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      // switching to a different item
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: item.file_url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setCurrentId(item.id);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentId(null);
          setSound(null);
        }
      });
    } catch (err) {
      Alert.alert("Playback error", err.message);
    }
  };

  // Rename saved audio
  const renameAudio = (item) => {
    const suggested =
      item.display_name ||
      (item.file_url ? item.file_url.split("/").pop().replace(/\.(mp3|wav|m4a)$/i, "") : "Audio");
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Rename audio",
        "Enter a new name",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async (text) => {
              const newName = (text || suggested).trim() || suggested;
              try {
                const { error } = await supabase
                  .from("audios")
                  .update({ display_name: newName })
                  .eq("id", item.id);
                if (error) throw error;
                // refresh locally
                setAudioFiles((prev) =>
                  prev.map((a) => (a.id === item.id ? { ...a, display_name: newName } : a))
                );
              } catch (err) {
                if (/column .*display_name/i.test(err.message)) {
                  Alert.alert(
                    "Add column required",
                    "Please add 'display_name text' to the 'audios' table to enable naming."
                  );
                } else {
                  Alert.alert("Rename failed", err.message);
                }
              }
            },
          },
        ],
        "plain-text",
        suggested
      );
    } else {
      Alert.alert(
        "Not supported",
        "Inline rename requires 'display_name' column and iOS prompt. On other platforms, add the column and we can wire a custom rename UI."
      );
    }
  };

  // Delete
  const deleteAudio = async (item) => {
    Alert.alert("Delete Audio", "Are you sure you want to delete this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await supabase.storage.from("capsules").remove([item.storage_path]);
            await supabase.from("audios").delete().eq("id", item.id);
            setAudioFiles((prev) => prev.filter((a) => a.id !== item.id));

            // stop playback if we deleted current
            if (currentId === item.id && sound) {
              await sound.unloadAsync();
              setSound(null);
              setCurrentId(null);
              setIsPlaying(false);
            }
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
    const filename = item.file_url ? item.file_url.split("/").pop() : "audio";
    const display = item.display_name || filename;

    const thisIsPlaying = currentId === item.id && isPlaying;

    return (
      <View style={styles.fileItem}>
        <Text style={styles.fileName}>{display}</Text>
        <Text style={styles.fileSub}>{filename}</Text>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: "#E0F0FF" }]}
            onPress={() => togglePlayback(item)}
          >
            <Ionicons
              name={thisIsPlaying ? "pause" : "play"}
              size={16}
              color="#0f172a"
            />
            <Text style={styles.controlBtnText}>
              {thisIsPlaying ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: "#FFF7F9" }]}
            onPress={() => renameAudio(item)}
          >
            <Feather name="edit-2" size={16} color="#E75480" />
            <Text style={[styles.controlBtnText, { color: "#E75480" }]}>
              Rename
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: "#FADADD" }]}
            onPress={() => deleteAudio(item)}
          >
            <Feather name="trash-2" size={16} color="#E75480" />
            <Text style={[styles.controlBtnText, { color: "#E75480" }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#FDF6E3", "#7FB3D5"]} // beige → pastel blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Audio Files</Text>
        </View>

        {/* Card container */}
        <View style={styles.containerCard}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={pickAudioFile}
            disabled={loading}
          >
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
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // header
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

  // white card
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

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  // list item
  fileItem: {
    padding: 12,
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0F0FF",
  },
  fileName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  fileSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  controlsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  controlBtnText: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "600",
  },
});
