// WrittenMessagesScreen.js
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

export default function WrittenMessagesScreen({ route, navigation }) {
  const { capsule } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const fetchMessages = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) throw new Error("No session found");

      const { data, error } = await supabase
        .from("written_messages")
        .select("*")
        .eq("capsule_id", capsule.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMessages(data);
    } catch (err) {
      Alert.alert(err.message);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const saveMessage = async () => {
    if (!newMessage) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session?.user) throw new Error("No session found");

      const { error } = await supabase
        .from("written_messages")
        .insert([
          {
            capsule_id: capsule.id,
            user_id: session.user.id,
            message: newMessage, // using 'message' column
          },
        ]);

      if (error) throw error;

      setNewMessage("");
      fetchMessages(); // refresh list
    } catch (err) {
      Alert.alert(err.message);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.messageItem}>
      <Text style={styles.messageText}>{item.message}</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3",
    padding: 20,
  },
  messageItem: {
    backgroundColor: "#E0F0FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  messageText: {
    color: "#7FB3D5",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#E0F0FF",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FDF6E3",
    fontWeight: "bold",
    fontSize: 16,
  },
});
