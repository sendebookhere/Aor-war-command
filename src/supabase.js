import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mjumydzjawapsomduwgj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdW15ZHpqYXdhcHNvbWR1d2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTA3MDMsImV4cCI6MjA5Mjk4NjcwM30.PBJ0ha5dgkBzoLTXRwPJeaemaO6ME9AZCCIpa3p4BV4'

export const supabase = createClient(supabaseUrl, supabaseKey)
