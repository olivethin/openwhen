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
  const [statusText, setStatusText] = useState(""); // ✅ tracks play/pause

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

      // ✅ reject invalid file types
      if (!file.name.match(/\.(mp3|wav|m4a)$/i)) {
        Alert.alert(
          "Invalid file",
          "Only audio files are supported (mp3, wav, m4a). Please do not upload PDFs or other file types."
        );
        return;
      }

      setLoading(true);

      // Get session user
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error("No user session found");

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
        setStatusText("Paused"); // ✅ now shows paused
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
      <Text style={{ fontWeight: "bold" }}>{item.file_url.split("/").pop()}</Text>
      <Text>{statusText || "Tap to Play (hold to delete)"}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={pickAudioFile}>
        <Text style={styles.buttonText}>+ Upload Audio</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#7FB3D5" />
      ) : (
        <FlatList
          data={audioFiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 20 }}
        />
      )}
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
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  fileItem: {
    padding: 12,
    backgroundColor: "#E0F0FF",
    borderRadius: 8,
    marginBottom: 8,
  },
});
