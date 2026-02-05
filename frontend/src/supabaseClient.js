import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eknaciktoazhptumobtz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbmFjaWt0b2F6aHB0dW1vYnR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNzksImV4cCI6MjA4NTg4MjI3OX0.xCxUpgbxxgdrHquNMbzaYYtsPIHFz6PIoYmrdMK3N0s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);