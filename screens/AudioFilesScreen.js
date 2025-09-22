//AudioFilesScreen
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
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av";
import { supabase } from "../supabase/supabase";

export default function AudioFilesScreen({ route }) {
  const { capsule } = route.params;
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);

  // Configure iOS audio mode
  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      });
    };
    setupAudio();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

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
      setAudioFiles(data);
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
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (result.canceled) return;

      const file = result.assets[0];

      if (!file.name.match(/\.(mp3|wav|m4a)$/i)) {
        Alert.alert("Invalid file", "Please select a valid audio file (mp3, wav, m4a).");
        return;
      }

      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error("No user session found");

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const storagePath = `audio/${capsule.id}/${file.name}`;

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

      // Upsert metadata into table
      const { error: upsertError } = await supabase.from("audios").upsert(
        [
          {
            capsule_id: capsule.id,
            user_id: user.id,
            file_url: fileUrl,
            storage_path: storagePath,
          },
        ],
        { onConflict: ["capsule_id", "storage_path"] }
      );
      if (upsertError) throw upsertError;

      Alert.alert("✅ Success", "Audio uploaded!");
      fetchAudioFiles();
    } catch (err) {
      console.error("Upload failed:", err);
      Alert.alert("❌ Upload failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Play or pause audio
  const playAudio = async (item) => {
    try {
      if (sound && currentTrack === item.storage_path) {
        const status = await sound.getStatusAsync();

        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            return;
          } else {
            await sound.playAsync();
            setIsPlaying(true);
            return;
          }
        }
      } else {
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: item.file_url },
          { shouldPlay: true }
        );

        setSound(newSound);
        setCurrentTrack(item.storage_path);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTrack(null);
          }
        });
      }
    } catch (err) {
      console.error("Playback error:", err);
      Alert.alert("Playback error", err.message);
    }
  };

  // Delete audio
  const deleteAudio = async (item) => {
    Alert.alert("Delete Audio", "Are you sure you want to delete this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            // 1. Remove from storage
            const { error: storageError } = await supabase.storage
              .from("capsules")
              .remove([item.storage_path]);
            if (storageError) throw storageError;

            // 2. Remove from table
            const { error: tableError } = await supabase
              .from("audios")
              .delete()
              .eq("capsule_id", capsule.id)
              .eq("storage_path", item.storage_path);
            if (tableError) throw tableError;

            // 3. Update UI immediately
            setAudioFiles((prev) =>
              prev.filter((f) => f.storage_path !== item.storage_path)
            );

            Alert.alert("Deleted", "The audio file was removed.");
          } catch (err) {
            console.error("Delete failed:", err);
            Alert.alert("Delete failed", err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    let statusText = "Tap to Play (hold to delete)";
    if (currentTrack === item.storage_path) {
      statusText = isPlaying ? "▶ Playing" : "⏸ Paused";
    }

    return (
      <TouchableOpacity
        style={styles.fileItem}
        onPress={() => playAudio(item)}
        onLongPress={() => deleteAudio(item)}
      >
        <Text style={{ fontWeight: "bold" }}>
          {item.file_url.split("/").pop()}
        </Text>
        <Text style={{ color: "#555" }}>{statusText}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7FB3D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickAudioFile}>
        <Text style={styles.buttonText}>+ Upload Audio</Text>
      </TouchableOpacity>

      <FlatList
        data={audioFiles}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 20 }}
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
    marginBottom: 10,
  },
  buttonText: { color: "#FDF6E3", fontWeight: "bold", fontSize: 16 },
  fileItem: {
    padding: 12,
    backgroundColor: "#E0F0FF",
    borderRadius: 8,
    marginBottom: 8,
  },
});
