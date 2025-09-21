//AccountScreen
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../supabase/supabase';

export default function AccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Not signed in");
        setUser(session.user);
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

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#FDF6E3', justifyContent: 'flex-start' }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 40 }}>
        Hello, {user?.email || 'User'}!
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: '#7FB3D5',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12
        }}
        onPress={() => navigation.navigate('CapsuleList')}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Go to My Capsules</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: '#E57373',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
        }}
        onPress={handleSignOut}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
