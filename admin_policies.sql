-- Admin Access Policies for Hamro Gunaso (Hakim Dashboard)
-- Target Admin Email: shrawanb121@gmail.com

-- 1. Policies for `posts`
-- Allow the admin to SELECT all posts (including private links)
CREATE POLICY "Superadmin Full SELECT Posts" 
ON public.posts 
FOR SELECT 
USING (auth.jwt() ->> 'email' = 'shrawanb121@gmail.com');

-- Allow the admin to UPDATE all posts (e.g., pinning)
CREATE POLICY "Superadmin Full UPDATE Posts" 
ON public.posts 
FOR UPDATE 
USING (auth.jwt() ->> 'email' = 'shrawanb121@gmail.com');

-- Allow the admin to DELETE all posts
CREATE POLICY "Superadmin Full DELETE Posts" 
ON public.posts 
FOR DELETE 
USING (auth.jwt() ->> 'email' = 'shrawanb121@gmail.com');


-- 2. Policies for `post_comments`
-- Allow the admin to SELECT all comments
CREATE POLICY "Superadmin Full SELECT Comments" 
ON public.post_comments 
FOR SELECT 
USING (auth.jwt() ->> 'email' = 'shrawanb121@gmail.com');

-- Allow the admin to DELETE all comments
CREATE POLICY "Superadmin Full DELETE Comments" 
ON public.post_comments 
FOR DELETE 
USING (auth.jwt() ->> 'email' = 'shrawanb121@gmail.com');


-- 3. Policies for `profiles`
-- Allow the admin to SELECT all profiles
CREATE POLICY "Superadmin Full SELECT Profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.jwt() ->> 'email' = 'shrawanb121@gmail.com');

-- Note: In Supabase, if RLS is enabled, multiple policies are evaluated with OR logic.
-- If an existing policy restricts `external_link` visibility, this new policy provides 
-- the admin an explicit path to view all columns, as they meet the 'USING' condition.
