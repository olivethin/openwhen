//supabase.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ihomgoweezexpwvuzpeb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlob21nb3dlZXpleHB3dnV6cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NjAyODEsImV4cCI6MjA3MzUzNjI4MX0.2dfqLT7-morQryeLOhJ97-SR6erKZrvOdM3pdx0CRGI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});