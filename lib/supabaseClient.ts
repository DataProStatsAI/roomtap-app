import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jooxkbprnbyldzbbbrji.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvb3hrYnBybmJ5bGR6YmJicmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDU1ODIsImV4cCI6MjA5MDYyMTU4Mn0.SMNcHyChOI5wtmaHMfzhP_1GJIXFc_giT95i-IfwiAY';

export const supabase = createClient(supabaseUrl, supabaseKey);