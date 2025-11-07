# Fix RLS Policy Error for Consent Endpoint

You're seeing this error because Row Level Security (RLS) policies on the `consent` table don't allow users to insert their own records.

## Quick Fix Options

### Option 1: Set Service Role Key (Recommended - 2 minutes)

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Find the **service_role** key (NOT the anon key - it's a secret key)
4. Copy it
5. Add it to your environment variables:

```bash
# In your .env file or environment
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

6. Restart your dev server

This bypasses RLS for server-side operations and is the recommended approach.

### Option 2: Update RLS Policies (Alternative - 5 minutes)

If you can't use the service role key, run this SQL in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/fix-consent-rls.sql`
5. Run the query

This will add RLS policies that allow users to insert/update their own consent records.

## Why This Happens

Supabase uses Row Level Security (RLS) to protect your data. By default, RLS blocks all operations unless there's an explicit policy allowing it. The `consent` table needs policies that allow:
- Users to insert their own consent records (`auth.uid() = user_id`)
- Users to update their own consent records
- Users to read their own consent records

## Verification

After applying either fix, try the consent flow again. You should see:
- No RLS errors in the console
- Successful consent creation
- User can proceed with onboarding

