// screens/AccountScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../supabase/supabase";

export default function AccountScreen({ route, navigation }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // If username passed from navigation (after registration/sign-in)
        if (route.params?.username) {
          setUsername(route.params.username);
          setLoading(false);
          return;
        }

        // Otherwise fetch from Supabase
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          navigation.replace("Register");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data?.username) {
          setUsername("User"); // fallback if username not found
        } else {
          setUsername(data.username);
        }

      } catch (err) {
        Alert.alert(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigation.replace("Register");
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
      <Text style={styles.title}>Hello, {username}!</Text>

      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3", // beige
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#7FB3D5", // pastel blue
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "60%",
  },
  buttonText: {
    color: "#FDF6E3",
    fontSize: 16,
    fontWeight: "bold",
  },
});
