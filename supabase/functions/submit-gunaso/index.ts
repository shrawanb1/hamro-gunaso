import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    const { method } = req;

    // 1. CORS Preflight
    if (method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // 2. Health Check (Diagnostic)
    if (method === 'GET') {
        return new Response(JSON.stringify({ status: "alive", version: "v5-diagnostic" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }

    try {
        console.log("Submit-Gunaso v5: Request Received");

        const body = await req.json().catch(() => ({}));
        const { turnstileToken, postPayload } = body;

        // --- 1. CLOUDFLARE TURNSTILE ---
        const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
        if (!secretKey) throw new Error('Missing TURNSTILE_SECRET_KEY on server.');

        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', turnstileToken || '');

        const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const cfData = await cfResponse.json();
        if (!cfData.success) {
            console.warn("Turnstile Failed:", cfData);
            return new Response(
                JSON.stringify({ error: 'Security verification failed.', details: cfData }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // --- 2. SETUP ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const authHeader = req.headers.get('Authorization');

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const supabaseUser = createClient(supabaseUrl, anonKey, {
            global: { headers: authHeader ? { Authorization: authHeader } : {} }
        });

        // --- 3. BAN CHECK ---
        const deviceId = postPayload?.device_id;
        const userEmail = postPayload?.user_email || 'none';

        if (deviceId) {
            const { data: banned } = await supabaseAdmin
                .from('banned_devices')
                .select('id')
                .or(`device_token.eq."${deviceId}",banned_email.eq."${userEmail}"`)
                .maybeSingle();

            if (banned) {
                console.warn("Blocked Banned User:", userEmail);
                return new Response(
                    JSON.stringify({ error: 'Your account or device is currently restricted.' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // --- 4. INSERT ---
        // We must extract user_email and device_id if they aren't in the schema
        const { user_email, ...databaseRow } = postPayload || {};

        const { data, error: insertError } = await supabaseUser
            .from('posts')
            .insert([databaseRow])
            .select()
            .maybeSingle();

        if (insertError) throw new Error(`Database Error: ${insertError.message}`);

        console.log("Post Created Successfully");
        return new Response(
            JSON.stringify(data),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error("Fatal Function Error:", err);
        return new Response(
            JSON.stringify({ error: err.message, stack: err.stack }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
