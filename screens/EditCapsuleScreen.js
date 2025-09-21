//EditCapsuleScreen
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { supabase } from "../supabase/supabase";

export default function EditCapsuleScreen({ route, navigation }) {
  const { capsule } = route.params;
  const [message, setMessage] = useState(capsule?.message || "");

  const saveMessage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No session found");

      const { error } = await supabase
        .from("capsules")
        .update({ message })
        .eq("id", capsule.id);

      if (error) throw error;

      Alert.alert("Message saved!");
      navigation.goBack();
    } catch (err) {
      Alert.alert(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Write Your Message</Text>
      <TextInput
        style={styles.input}
        placeholder="Write your message here..."
        multiline
        value={message}
        onChangeText={setMessage}
      />
      <TouchableOpacity style={styles.button} onPress={saveMessage}>
        <Text style={styles.buttonText}>Save</Text>
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
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#7FB3D5",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#E0F0FF",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    height: 200,
    textAlignVertical: "top",
    marginBottom: 15,
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
