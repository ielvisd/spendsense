-- RLS Policies for Operator Access
-- Run this in your Supabase SQL Editor to allow operators to view all data
-- Operators are identified by user_metadata.role = 'operator' or user_metadata.is_operator = true

-- ============================================
-- USERS TABLE
-- ============================================

-- Allow operators to select all users
DROP POLICY IF EXISTS "Operators can select all users" ON users;
CREATE POLICY "Operators can select all users"
ON users FOR SELECT
USING (
  auth.uid() = id OR  -- Users can see themselves
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- ============================================
-- SIGNALS TABLE
-- ============================================

-- Allow operators to select all signals
DROP POLICY IF EXISTS "Operators can select all signals" ON signals;
CREATE POLICY "Operators can select all signals"
ON signals FOR SELECT
USING (
  auth.uid() = user_id OR  -- Users can see their own signals
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- ============================================
-- PERSONAS TABLE
-- ============================================

-- Allow operators to select all personas
DROP POLICY IF EXISTS "Operators can select all personas" ON personas;
CREATE POLICY "Operators can select all personas"
ON personas FOR SELECT
USING (
  auth.uid() = user_id OR  -- Users can see their own persona
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- ============================================
-- RECOMMENDATIONS TABLE
-- ============================================

-- Allow operators to select all recommendations
DROP POLICY IF EXISTS "Operators can select all recommendations" ON recommendations;
CREATE POLICY "Operators can select all recommendations"
ON recommendations FOR SELECT
USING (
  auth.uid() = user_id OR  -- Users can see their own recommendations
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- Allow operators to update recommendations (for approve/flag)
DROP POLICY IF EXISTS "Operators can update recommendations" ON recommendations;
CREATE POLICY "Operators can update recommendations"
ON recommendations FOR UPDATE
USING (
  (auth.jwt() ->> 'role') = 'operator' OR
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
)
WITH CHECK (
  (auth.jwt() ->> 'role') = 'operator' OR
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- ============================================
-- LOGS TABLE
-- ============================================

-- Allow operators to select all logs
DROP POLICY IF EXISTS "Operators can select all logs" ON logs;
CREATE POLICY "Operators can select all logs"
ON logs FOR SELECT
USING (
  auth.uid() = user_id OR  -- Users can see their own logs
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- Allow operators to insert logs (for flagging)
DROP POLICY IF EXISTS "Operators can insert logs" ON logs;
CREATE POLICY "Operators can insert logs"
ON logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR  -- Users can insert their own logs
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can insert logs
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- ============================================
-- ACCOUNTS TABLE
-- ============================================

-- Allow operators to select all accounts
DROP POLICY IF EXISTS "Operators can select all accounts" ON accounts;
CREATE POLICY "Operators can select all accounts"
ON accounts FOR SELECT
USING (
  auth.uid() = user_id OR  -- Users can see their own accounts
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================

-- Allow operators to select all transactions
DROP POLICY IF EXISTS "Operators can select all transactions" ON transactions;
CREATE POLICY "Operators can select all transactions"
ON transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transactions.account_id
    AND (accounts.user_id = auth.uid() OR  -- Users can see their own transactions
         (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
         (auth.jwt() ->> 'role') = 'admin' OR
         (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true')
  )
);

-- ============================================
-- LIABILITIES TABLE
-- ============================================

-- Allow operators to select all liabilities
DROP POLICY IF EXISTS "Operators can select all liabilities" ON liabilities;
CREATE POLICY "Operators can select all liabilities"
ON liabilities FOR SELECT
USING (
  auth.uid() = user_id OR  -- Users can see their own liabilities
  (auth.jwt() ->> 'role') = 'operator' OR  -- Operators can see all
  (auth.jwt() ->> 'role') = 'admin' OR
  (auth.jwt() -> 'user_metadata' ->> 'is_operator') = 'true'
);

