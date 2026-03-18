import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    console.log("Submit-Gunaso: Request received");

    try {
        // --- SAFE JSON PARSING ---
        const body = await req.json().catch(() => null);
        if (!body) {
            throw new Error("Invalid request: Missing JSON body");
        }

        const { turnstileToken, postPayload } = body;

        if (!turnstileToken) {
            throw new Error("Security check failed: Missing Turnstile token");
        }
        if (!postPayload) {
            throw new Error("Submission failed: Missing post payload");
        }

        console.log("Payload validated for User:", postPayload.user_id);

        // --- 1. CLOUDFLARE TURNSTILE (MUST HAPPEN FIRST) ---
        const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
        if (!secretKey) {
            console.error("CRITICAL: TURNSTILE_SECRET_KEY is missing from environment");
            throw new Error('Server configuration error: missing Turnstile secret key.');
        }

        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', turnstileToken);

        const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const cfData = await cfResponse.json();
        if (!cfData.success) {
            console.warn("Turnstile check failed:", cfData);
            return new Response(
                JSON.stringify({ error: 'Security verification failed. Please refresh and try again.', details: cfData }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // --- 2. ADMIN CLIENT (BYPASS RLS FOR BAN CHECK) ---
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceKey) {
            console.error("CRITICAL: Supabase Admin configuration missing");
            throw new Error("Server configuration error: missing database credentials.");
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // --- 3. BULLETPROOF BAN CHECK ---
        const deviceId = postPayload.device_id || 'unknown';
        const userEmail = postPayload.user_email || 'none';

        console.log(`Checking ban status for Device: ${deviceId}, Email: ${userEmail}`);

        const { data: bannedRecord, error: banCheckError } = await supabaseAdmin
            .from('banned_devices')
            .select('*')
            .or(`device_token.eq."${deviceId}",banned_email.eq."${userEmail}"`)
            .maybeSingle();

        if (banCheckError) {
            console.error("Ban check database error (continuing anyway):", banCheckError.message);
            // We proceed if the query itself fails, to avoid bricking the platform on DB hiccups
        }

        if (bannedRecord) {
            console.warn(`BLOCKED: Banned user attempt detected for ${userEmail} / ${deviceId}`);
            return new Response(
                JSON.stringify({ error: 'Your account or device is currently restricted from posting.', details: 'Access denied due to active ban.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // --- 4. USER CLIENT (ENFORCE RLS ON INSERT) ---
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error("Unauthorized: Missing Authorization header");
        }

        const supabaseUser = createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: { headers: { Authorization: authHeader } },
            }
        );

        // --- 5. FINAL INSERT ---
        console.log("Inserting gunaso into database...");
        const { data, error: insertError } = await supabaseUser
            .from('posts')
            .insert([postPayload])
            .select()
            .maybeSingle();

        if (insertError) {
            console.error("Insertion error:", insertError);
            throw new Error(`Database Error: ${insertError.message}`);
        }

        console.log("Submission successful!");
        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (err: any) {
        const errorMsg = err.message || "An unexpected server error occurred";
        console.error("EDGE FUNCTION FATAL:", errorMsg, err.stack);

        return new Response(
            JSON.stringify({
                error: errorMsg,
                details: err.toString(),
                stack: err.stack
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
