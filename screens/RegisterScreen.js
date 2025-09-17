// screens/RegisterScreen.js
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../supabase/supabase"; // adjust path if needed

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  // REGISTER NEW USER
  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert("Please fill in all fields!");
      return;
    }

    setLoading(true);

    try {
      // Sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        Alert.alert(signUpError.message);
        setLoading(false);
        return;
      }

      // Insert username into profiles table
      const userId = signUpData.user?.id;
      if (!userId) throw new Error("No user ID returned from Supabase");

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        username,
        email,
      });

      if (profileError) {
        Alert.alert(profileError.message);
      } else {
        Alert.alert("Registration successful!");
        navigation.replace("Account", { username });
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

      // fetch username from profiles table
      let { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      // If profile does not exist, create a default username
      if (!profileData) {
        const defaultUsername = email.split("@")[0]; // use email prefix
        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          username: defaultUsername,
          email,
        });

        if (insertError) {
          Alert.alert(insertError.message);
          setLoading(false);
          return;
        }

        profileData = { username: defaultUsername };
      }

      navigation.replace("Account", { username: profileData.username });

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
    backgroundColor: "#FDF6E3", // beige background
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#7FB3D5", marginBottom: 10 },
  subtitle: { fontSize: 18, color: "#7FB3D5", marginBottom: 20 },
  input: {
    width: "100%",
    backgroundColor: "#E0F0FF", // pastel blue input
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
