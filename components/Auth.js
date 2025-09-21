//Auth.js
import { useState } from 'react';
import { Alert, View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { supabase } from '../supabase/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { data: { session } = {}, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert(error.message);
    else if (session?.user) Alert.alert('Signed in!'); // replace with navigation
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) Alert.alert(error.message);
    else Alert.alert('Signed up!'); // replace with navigation

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <Text>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Sign In" onPress={signInWithEmail} disabled={loading} />
      <View style={{ height: 10 }} />
      <Button title="Sign Up" onPress={signUpWithEmail} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 50, padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10 },
});
