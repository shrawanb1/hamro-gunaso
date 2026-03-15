-- admin_god_mode.sql
-- Run this in your Supabase SQL Editor to create the RPC (Postgres Function)

-- Step 1: Create the function with SECURITY DEFINER so it runs with elevated privileges, 
-- but we wrap it in strict checks to only allow the specific admin.
CREATE OR REPLACE FUNCTION admin_override_post(
    p_id UUID,
    p_content TEXT,
    p_agree_offset INT,
    p_disagree_offset INT,
    p_feedback TEXT
) RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email TEXT;
BEGIN
    -- 1. Ensure caller is authenticated via JWT
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Verify identity: Fetch the caller's email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = auth.uid();

    -- 3. Strict Authorization Check
    IF v_user_email != 'shrawanb121@gmail.com' THEN
        RAISE EXCEPTION 'Unauthorized: God Mode access restricted to shrawanb121@gmail.com';
    END IF;

    -- 4. Execute the override parameters
    -- Note: We are directly adding the offset to whatever the current agree_count/disagree_count is.
    -- If the offset is 0, it does nothing. If it's a positive/negative number, it shifts the value.
    UPDATE public.posts
    SET 
        content = p_content,
        agree_count = agree_count + p_agree_offset,
        disagree_count = disagree_count + p_disagree_offset,
        admin_feedback = p_feedback,
        updated_at = NOW()
    WHERE id = p_id;

END;
$$;

-- Note: We also need to add the admin_feedback column if it doesn't already exist.
-- Safely add the column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='posts' AND column_name='admin_feedback'
    ) THEN
        ALTER TABLE public.posts ADD COLUMN admin_feedback TEXT;
    END IF;
END $$;
