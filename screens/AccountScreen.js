// AccountScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../supabase/supabase";

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Not signed in");

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        setUser({
          id: session.user.id,
          email: session.user.email,
          username: profile?.username || "User",
        });
      } catch (err) {
        Alert.alert(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: "Register" }],
      });
    } catch (err) {
      Alert.alert(err.message);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#FDF6E3", "#B3D9FF"]} style={styles.fullScreen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7FB3D5" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#FDF6E3", "#B3D9FF"]} style={styles.fullScreen}>
      <View style={styles.container}>
        {/* Profile Image */}
        <View style={styles.avatarWrap}>
          <Image
            source={require("../assets/boo.png")}
            style={styles.avatarImg}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.welcome}>Hello, {user?.username}!</Text>

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate("CapsuleList")}
        >
          <Text style={styles.buttonText}>Go to My Capsules</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={handleSignOut}>
          <Text style={styles.buttonSecondaryText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarWrap: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: "#7FB3D5",
    overflow: "hidden",
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "115%",
    height: "115%",
  },
  welcome: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 30,
    textAlign: "center",
  },
  buttonPrimary: {
    backgroundColor: "#7FB3D5", // soft blue
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    width: "80%",
  },
  buttonSecondary: {
    backgroundColor: "#FADADD", // pale pink
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: "#C85C5C", // pink text
    fontWeight: "bold",
    fontSize: 16,
  },
});
