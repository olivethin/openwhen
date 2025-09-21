// CreateCapsuleScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { supabase } from "../supabase/supabase";

export default function CreateCapsuleScreen({ navigation }) {
  const [title, setTitle] = useState("");

  const createCapsule = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No session found");

      const { error } = await supabase
        .from("capsules")
        .insert([{ user_id: session.user.id, title }]);

      if (error) throw error;

      Alert.alert("Capsule created!");
      navigation.goBack(); // or navigate to CapsuleList
    } catch (err) {
      Alert.alert(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Capsule Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter capsule title..."
        value={title}
        onChangeText={setTitle}
      />
      <TouchableOpacity style={styles.button} onPress={createCapsule}>
        <Text style={styles.buttonText}>Create Capsule</Text>
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
