import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { turnstileToken, postPayload } = await req.json()

        // --- 1. Verify Turnstile Token with Cloudflare (Perform this FIRST) ---
        const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')
        if (!secretKey) {
            throw new Error('Server configuration error: missing Turnstile secret key.')
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
            console.error('Turnstile verification failed:', cfData);
            return new Response(
                JSON.stringify({ error: 'Captcha verification failed. Please try again.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // --- 2. Initialize Supabase Client with Service Role (to check ban status properly) ---
        // We use service role to ensure we can query banned_devices table if RLS is strict
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // --- 3. Robust Ban Check (Fixing the Global Outage) ---
        // Null Safety: Use .maybeSingle() and handle matches explicitly
        const { data: bannedRecord, error: banCheckError } = await supabaseAdmin
            .from('banned_devices')
            .select('*')
            .or(`device_token.eq.${postPayload.device_id},banned_email.eq.${postPayload.user_email || 'none'}`)
            .maybeSingle();

        if (banCheckError) {
            console.error('Ban check error:', banCheckError);
            // Don't crash if ban check fails, but log it. 
            // However, based on user request, we want it to proceed if *no* record is found.
        }

        if (bannedRecord) {
            return new Response(
                JSON.stringify({ error: 'Your account or device has been banned from posting.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // --- 4. Initialize User Client for the actual Insert (Enforces RLS) ---
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // --- 5. Insert Post into Database ---
        const { data, error: insertError } = await supabaseUser
            .from('posts')
            .insert([postPayload])
            .select()
            .maybeSingle(); // Changed from .single() for safety

        if (insertError) {
            throw new Error(`Database error: ${insertError.message}`);
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (err) {
        console.error('Edge Function Fatal Error:', err.message)
        return new Response(
            JSON.stringify({ error: err.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
