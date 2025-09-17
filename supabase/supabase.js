import { Button, Text, View } from 'react-native';
import { supabase } from '../supabase/supabase';

export default function HomePage() {
  const signInAnonymously = async () => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: 'test@example.com',  // replace with your test email
    });
    if (error) console.log('Error:', error);
    else console.log('Sign in email sent:', data);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to OpenWhen!</Text>
      <Button title="Sign in" onPress={signInAnonymously} />
    </View>
  );
}
