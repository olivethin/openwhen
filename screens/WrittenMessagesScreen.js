//WrittenMessagesScreen
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../supabase/supabase";

export default function WrittenMessagesScreen({ route }) {
  const { capsule } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // Fetch messages
  const fetchMessages = async () => {
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
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Add message
  const saveMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) throw new Error("No session found");

      const { error } = await supabase.from("written_messages").insert([
        {
          capsule_id: capsule.id,
          user_id: session.user.id,
          message: newMessage.trim(),
        },
      ]);

      if (error) throw error;

      setNewMessage("");
      fetchMessages();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  // Update message
  const updateMessage = async (id) => {
    try {
      const { error } = await supabase
        .from("written_messages")
        .update({ message: editingText })
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
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("written_messages")
              .delete()
              .eq("id", id);

            if (error) throw error;

            setMessages((prev) => prev.filter((msg) => msg.id !== id));
          } catch (err) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.messageItem}>
      {editingId === item.id ? (
        <>
          <TextInput
            style={styles.input}
            value={editingText}
            onChangeText={setEditingText}
            placeholder="Edit message..."
            multiline
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => updateMessage(item.id)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingId(null);
                setEditingText("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.messageText}>{item.message}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => {
                setEditingId(item.id);
                setEditingText(item.message);
              }}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMessage(item.id)}>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TextInput
        style={styles.input}
        placeholder="Write a message..."
        value={newMessage}
        onChangeText={setNewMessage}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={saveMessage}>
        <Text style={styles.buttonText}>+ Add Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDF6E3", padding: 20 },
  messageItem: {
    backgroundColor: "#E0F0FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  messageText: { color: "#333", fontSize: 16, marginBottom: 6 },
  row: { flexDirection: "row", gap: 15 },
  actionText: { color: "#007BFF", fontSize: 14 },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
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
});
