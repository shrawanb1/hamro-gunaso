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

        // 1. Verify Turnstile Token with Cloudflare
        const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')
        if (!secretKey) {
            throw new Error('Server configuration error: missing Turnstile secret key.')
        }

        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', turnstileToken);
        // Optionally append user IP: formData.append('remoteip', req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '');

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

        // 2. Initialize Supabase Client with User's Auth Context
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // 3. Insert Post into Database
        const { data, error } = await supabaseClient
            .from('posts')
            .insert([postPayload])
            .select()
            .single()

        if (error) throw error

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    } catch (error) {
        console.error('Edge Function Error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
