-- =================================================================
-- hamro_gunaso_fixes.sql
-- Run this ENTIRE script in your Supabase SQL Editor.
-- It is safe to run multiple times (uses IF EXISTS / OR REPLACE).
-- =================================================================


-- -----------------------------------------------------------------
-- FIX 1: CASCADE DELETES
-- This allows you to delete users in auth.users without FK errors.
-- It updates foreign keys on `profiles` and `posts` to cascade.
-- -----------------------------------------------------------------

-- 1a. Fix `profiles` table (id -> auth.users.id)
-- First, find and drop the existing constraint.
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Then re-add with ON DELETE CASCADE
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE;


-- 1b. Fix `posts` table (user_id -> auth.users.id)
-- First, find and drop the existing constraint.
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    SELECT tc.constraint_name INTO v_constraint
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'posts'
        AND kcu.column_name = 'user_id';

    IF v_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT %I', v_constraint);
    END IF;
END $$;

-- Re-add with ON DELETE CASCADE
ALTER TABLE public.posts
    ADD CONSTRAINT posts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE;


-- -----------------------------------------------------------------
-- FIX 2: NEW COLUMNS FOR GOD MODE
-- Safely adds the offset columns and admin_feedback to `posts`.
-- -----------------------------------------------------------------

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS agree_offset   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disagree_offset INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS admin_feedback  TEXT;


-- -----------------------------------------------------------------
-- FIX 3: GOD MODE RPC FUNCTION
-- Creates the `admin_override_post` function, callable from hakim.js.
-- Strict security: only shrawanb121@gmail.com can execute it.
-- -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_override_post(
    p_id             UUID,
    p_content        TEXT,
    p_agree_offset   INTEGER,
    p_disagree_offset INTEGER,
    p_feedback       TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Strict authorization: check the JWT email claim directly
    IF (auth.jwt() ->> 'email') IS DISTINCT FROM 'shrawanb121@gmail.com' THEN
        RAISE EXCEPTION 'Unauthorized: God Mode is restricted to the superadmin.';
    END IF;

    -- Apply overrides
    UPDATE public.posts
    SET
        content          = p_content,
        agree_offset     = p_agree_offset,
        disagree_offset  = p_disagree_offset,
        admin_feedback   = NULLIF(trim(p_feedback), ''),
        updated_at       = NOW()
    WHERE id = p_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post with id % not found.', p_id;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users (the RLS check inside is the real guard)
GRANT EXECUTE ON FUNCTION public.admin_override_post TO authenticated;
