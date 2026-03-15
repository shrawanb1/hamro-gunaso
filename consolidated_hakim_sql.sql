-- =================================================================
-- HAKIM COMMAND CENTER: CONSOLIDATED SQL OVERHAUL (v5)
-- =================================================================

-- 1. EXTEND SCHEMA
-- Posts extensions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='agree_offset') THEN
        ALTER TABLE public.posts ADD COLUMN agree_offset integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='disagree_offset') THEN
        ALTER TABLE public.posts ADD COLUMN disagree_offset integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='admin_feedback') THEN
        ALTER TABLE public.posts ADD COLUMN admin_feedback text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='status') THEN
        ALTER TABLE public.posts ADD COLUMN status text DEFAULT 'Open';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='updated_at') THEN
        ALTER TABLE public.posts ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Profiles extensions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_banned') THEN
        ALTER TABLE public.profiles ADD COLUMN is_banned boolean DEFAULT false;
    END IF;
END $$;

-- 2. CASCADE DELETE ENFORCEMENT
ALTER TABLE IF EXISTS public.post_votes 
    DROP CONSTRAINT IF EXISTS post_votes_post_id_fkey,
    ADD CONSTRAINT post_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.post_comments 
    DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey,
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- 3. GOD MODE RPC: Admin Override
CREATE OR REPLACE FUNCTION public.admin_override_post(
    p_id uuid,
    p_content text,
    p_agree_offset integer,
    p_disagree_offset integer,
    p_feedback text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check
    IF auth.jwt() ->> 'email' <> 'shrawanb121@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: You are not the Hakim.';
    END IF;

    UPDATE public.posts
    SET
        content = p_content,
        agree_offset = p_agree_offset,
        disagree_offset = p_disagree_offset,
        admin_feedback = NULLIF(trim(p_feedback), ''),
        updated_at = NOW()
    WHERE id = p_id;
END;
$$;

-- 4. STATS RPC: Dashboard Metrics
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_posts bigint;
    resolved_posts bigint;
    pending_posts bigint;
    total_users bigint;
BEGIN
    SELECT count(*) INTO total_posts FROM public.posts;
    SELECT count(*) INTO resolved_posts FROM public.posts WHERE status = 'Resolved';
    SELECT count(*) INTO pending_posts FROM public.posts WHERE status = 'Pending';
    SELECT count(*) INTO total_users FROM auth.users;

    RETURN json_build_object(
        'total_posts', total_posts,
        'resolved_posts', resolved_posts,
        'pending_posts', pending_posts,
        'total_users', total_users
    );
END;
$$;

-- 5. GEOGRAPHIC RPC: Province Distribution
CREATE OR REPLACE FUNCTION public.get_province_distribution()
RETURNS TABLE(province text, post_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT p.province, count(*)::bigint
    FROM public.posts p
    WHERE p.province IS NOT NULL
    GROUP BY p.province;
END;
$$;

-- 6. BAN RPC: Admin Moderation
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id uuid, p_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Security Check
    IF auth.jwt() ->> 'email' <> 'shrawanb121@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: Authorized Admin Only.';
    END IF;

    UPDATE public.profiles
    SET is_banned = p_status
    WHERE id = p_user_id;
END;
$$;

-- 7. RANKED POSTS FIX (Public Feed Ambiguity Fix)
CREATE OR REPLACE FUNCTION public.get_ranked_posts(
    filter_type text DEFAULT NULL::text,
    filter_province text DEFAULT NULL::text,
    filter_district text DEFAULT NULL::text,
    filter_limit integer DEFAULT 50
)
RETURNS TABLE(
    id uuid, 
    content text, 
    type text, 
    province text, 
    district text, 
    is_anonymous boolean, 
    user_id uuid, 
    created_at timestamp with time zone, 
    is_pinned boolean, 
    agree_count bigint, 
    disagree_count bigint, 
    comment_count bigint, 
    author_full_name text, 
    author_avatar_url text, 
    user_vote text, 
    media_links text[], 
    external_link text, 
    is_link_public boolean,
    agree_offset integer,
    disagree_offset integer,
    admin_feedback text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.content, 
        p.type, 
        p.province, 
        p.district, 
        p.is_anonymous, 
        p.user_id, 
        p.created_at, 
        p.is_pinned,
        (SELECT count(*) FROM public.post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'agree')::bigint,
        (SELECT count(*) FROM public.post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'disagree')::bigint,
        (SELECT count(*) FROM public.post_comments pc WHERE pc.post_id = p.id)::bigint,
        prof.full_name,
        prof.avatar_url,
        v.vote_type,
        COALESCE(p.media_links, '{}'::text[]),
        p.external_link,
        p.is_link_public,
        p.agree_offset,
        p.disagree_offset,
        p.admin_feedback
    FROM public.posts AS p
    LEFT JOIN public.profiles AS prof ON p.user_id = prof.id
    LEFT JOIN public.post_votes AS v ON p.id = v.post_id AND v.user_id = auth.uid()
    WHERE (filter_type IS NULL OR p.type = filter_type)
      AND (filter_province IS NULL OR p.province = filter_province)
      AND (filter_district IS NULL OR p.district = filter_district)
    ORDER BY
        p.is_pinned DESC,
        ((SELECT count(*) FROM public.post_votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'agree') + p.agree_offset) DESC,
        p.created_at DESC
    LIMIT filter_limit;
END;
$$;

-- 8. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_province_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranked_posts TO anon, authenticated;
