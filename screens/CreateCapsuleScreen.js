import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../supabase/supabase";

export default function CreateCapsuleScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        Alert.alert("No session found. Please sign in again.");
        navigation.replace("Register");
      } else {
        setSession(data.session);
      }
    };
    getSession();
  }, []);

  const handleSave = async () => {
    if (!title || !message) {
      Alert.alert("Please enter both title and message");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("capsules").insert([
        { user_id: session.user.id, title, message },
      ]);

      if (error) throw error;

      Alert.alert("Capsule saved!");
      navigation.goBack(); // go back to list
    } catch (err) {
      Alert.alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7FB3D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create New Capsule</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter capsule title"
      />

      <Text style={styles.label}>Write your message here</Text>
      <TextInput
        style={[styles.input, styles.messageInput]}
        value={message}
        onChangeText={setMessage}
        placeholder="Enter your message"
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#FDF6E3" /> : <Text style={styles.saveButtonText}>Save Capsule</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7FB3D5",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7FB3D5",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#E0F0FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  messageInput: {
    height: 150,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#FDF6E3",
    fontSize: 16,
    fontWeight: "bold",
  },
});
