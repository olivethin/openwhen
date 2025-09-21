// screens/AuthScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../supabase/supabase";

export default function AuthScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // REGISTER NEW USER
  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert("Please fill in all fields!");
      return;
    }

    setLoading(true);

    try {
      // Sign up user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        Alert.alert(signUpError.message);
        setLoading(false);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) throw new Error("No user ID returned from Supabase");

      // Insert username into profiles table
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        username,
        email,
      });

      if (profileError) {
        Alert.alert(profileError.message);
      } else {
        Alert.alert("Registration successful!");
        navigation.replace("Account", { username }); // pass username
      }
    } catch (err) {
      Alert.alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // SIGN IN EXISTING USER
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Please enter email and password!");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        Alert.alert(error.message);
        setLoading(false);
        return;
      }

      const userId = data.user.id;

      // Fetch username from profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();

      if (profileError) {
        Alert.alert("Profile not found!");
      } else {
        navigation.replace("Account", { username: profileData.username });
      }
    } catch (err) {
      Alert.alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to OpenWhen!</Text>
      <Text style={styles.subtitle}>Create your account or sign in</Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#FDF6E3" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn} disabled={loading}>
        <Text style={styles.signInText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF6E3",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#7FB3D5", marginBottom: 10 },
  subtitle: { fontSize: 18, color: "#7FB3D5", marginBottom: 20 },
  input: {
    width: "100%",
    backgroundColor: "#E0F0FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    width: "100%",
    backgroundColor: "#7FB3D5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FDF6E3", fontWeight: "bold", fontSize: 16 },
  signInButton: { marginTop: 15 },
  signInText: { color: "#7FB3D5", fontSize: 14, textDecorationLine: "underline" },
});
