//CapsuleDetailScreen
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function CapsuleDetailScreen({ route, navigation }) {
  const { capsule } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{capsule.title}</Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => navigation.navigate("WrittenMessages", { capsule })}
      >
        <Text style={styles.optionText}> Written Messages</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => alert("Audio Files screen coming soon")}
      >
        <Text style={styles.optionText}> Audio Files</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => alert("Image Files screen coming soon")}
      >
        <Text style={styles.optionText}> Image Files</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#7FB3D5",
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#E0F0FF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#7FB3D5",
  },
});
