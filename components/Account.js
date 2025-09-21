//Account.js
import { useEffect, useState } from 'react';
import { Alert, View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { supabase } from '../supabase/supabase';

export default function Account({ session }) {
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) fetchProfile();
  }, [session]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data, error, status } = await supabase
        .from('profiles')
        .select('username, website')
        .eq('id', session.user.id)
        .single();

      if (error && status !== 406) throw error;
      if (data) {
        setUsername(data.username);
        setWebsite(data.website);
      }
    } catch (error) {
      Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const updates = {
        id: session.user.id,
        username,
        website,
        updated_at: new Date(),
      };
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      Alert.alert('Profile updated!');
    } catch (error) {
      Alert.alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    Alert.alert('Signed out!'); // replace with navigation
  }

  if (!session) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text>Email: {session.user.email}</Text>
      <Text>Username</Text>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} />
      <Text>Website</Text>
      <TextInput style={styles.input} value={website} onChangeText={setWebsite} />

      <Button title={loading ? 'Loading...' : 'Update'} onPress={updateProfile} disabled={loading} />
      <View style={{ height: 10 }} />
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 40, padding: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10 },
});
