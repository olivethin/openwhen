// CapsuleDetailScreen.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";

export default function CapsuleDetailScreen({ route, navigation }) {
  const { capsule } = route.params;

  return (
    <LinearGradient
      colors={["#FDF6E3", "#B3D9FF"]} // beige → pastel blue
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Capsule Details</Text>
        </View>

        {/* Options */}
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => navigation.navigate("WrittenMessages", { capsule })}
          >
            <View style={styles.navLeft}>
              <Feather name="edit-3" size={18} color="#7FB3D5" />
              <Text style={styles.navText}>Written Messages</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7FB3D5" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => alert("Audio Files screen coming soon")}
          >
            <View style={styles.navLeft}>
              <Feather name="mic" size={18} color="#7FB3D5" />
              <Text style={styles.navText}>Audio Files</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7FB3D5" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => alert("Image Files screen coming soon")}
          >
            <View style={styles.navLeft}>
              <Feather name="image" size={18} color="#7FB3D5" />
              <Text style={styles.navText}>Image Files</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7FB3D5" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  navCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E0F0FF",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
});
