-- Fix RLS policies for consent table to allow users to insert/update their own records
-- Run this in your Supabase SQL editor if you don't have a service role key

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own consent" ON consent;
DROP POLICY IF EXISTS "Users can update their own consent" ON consent;
DROP POLICY IF EXISTS "Users can select their own consent" ON consent;

-- Allow users to insert their own consent records
CREATE POLICY "Users can insert their own consent"
ON consent FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own consent records
CREATE POLICY "Users can update their own consent"
ON consent FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own consent records
CREATE POLICY "Users can select their own consent"
ON consent FOR SELECT
USING (auth.uid() = user_id);

-- Also fix RLS for users table to allow users to insert/update their own records
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can select their own record" ON users;

-- Allow users to insert their own user record
CREATE POLICY "Users can insert their own record"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own user record
CREATE POLICY "Users can update their own record"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to select their own user record
CREATE POLICY "Users can select their own record"
ON users FOR SELECT
USING (auth.uid() = id);

