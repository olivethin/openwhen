//AccountScreen
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from '../supabase/supabase';

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 1. Get the session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Not signed in");

        // 2. Fetch profile from profiles table
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        // 3. Store combined user info (auth + profile)
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
        routes: [{ name: 'Register' }],
      });
    } catch (err) {
      Alert.alert(err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7FB3D5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Hello, {user?.username}!
      </Text>

      <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.navigate('CapsuleList')}>
        <Text style={styles.buttonText}>Go to My Capsules</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6E3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF6E3',
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  buttonPrimary: {
    backgroundColor: '#7FB3D5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    width: '80%',
  },
  buttonSecondary: {
    backgroundColor: '#E57373',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

