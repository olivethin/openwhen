// CapsuleListScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase/supabase";

export default function CapsuleListScreen({ navigation }) {
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCapsules = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        Alert.alert("No session found. Please sign in again.");
        navigation.replace("Register");
        return;
      }

      const { data, error } = await supabase
        .from("capsules")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCapsules(data || []);
    } catch (err) {
      Alert.alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCapsules();
    }, [])
  );

  // Filter capsules based on search query
  const filteredCapsules = capsules.filter((capsule) =>
    capsule.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.capsuleButton}
      onPress={() => navigation.navigate("CapsuleDetail", { capsule: item })}
    >
      <Text style={styles.capsuleTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7FB3D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search capsules..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {filteredCapsules.length === 0 ? (
        <Text>No matching capsules found.</Text>
      ) : (
        <FlatList
          data={filteredCapsules}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("CreateCapsule")}
      >
        <Text style={styles.addButtonText}>+ New Capsule</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3",
    padding: 20,
    alignItems: "center",
  },
  searchBar: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 15,
    fontSize: 16,
  },
  capsuleButton: {
    width: "100%",
    backgroundColor: "#E0F0FF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  capsuleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#7FB3D5",
  },
  addButton: {
    width: "100%",
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  addButtonText: {
    color: "#FDF6E3",
    fontSize: 16,
    fontWeight: "bold",
  },
});
