
import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwbrgokfgelgxeonoqah.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3YnJnb2tmZ2VsZ3hlb25vcWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQwODgsImV4cCI6MjA2Mjc2MDA4OH0.xSIMIzEhsIfpOkH4NzUqSOXb-k-tOyCQpOzMAQKvPfc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
