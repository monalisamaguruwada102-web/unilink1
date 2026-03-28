// =====================================================
// SUPABASE EDGE FUNCTION: push-notify
// Triggered by Supabase Database Webhook on INSERT to 'notifications' table
// Also callable directly for call alerts
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// VAPID credentials (set as Supabase Secrets)
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@unilink.app';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── VAPID JWT Signing ─────────────────────────────────────────────────────────
async function signVapidJwt(audience: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({
    aud: new URL(audience).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const keyData = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const privKey = await crypto.subtle.importKey('raw', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name:'ECDSA', hash:'SHA-256' }, privKey, new TextEncoder().encode(`${header}.${payload}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${header}.${payload}.${sigB64}`;
}

function base64UrlToUint8Array(base64: string): Uint8Array {
  const b64 = (base64 + '===').slice(0, base64.length + (4 - base64.length % 4) % 4).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// ── Send a push notification to one device ────────────────────────────────────
async function sendPush(endpoint: string, p256dh: string, auth: string, payload: object) {
  const jwt = await signVapidJwt(endpoint);
  const vapidHeaders = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  const body = JSON.stringify(payload);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidHeaders,
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body,
  });

  return res.status;
}

// ── Main Handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  try {
    const body = await req.json();
    
    // Body from DB webhook: { record: { user_id, type, content, ... } }
    // Body from direct call: { user_id, type, title, message, match_id }
    const record = body.record || body;
    const userId = record.user_id;
    const notifType = record.type || 'message';
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400 });
    }

    // Fetch user's push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No subscriptions found' }), { status: 200 });
    }

    // Build notification payload
    const isCall = notifType === 'call';
    const notifPayload = {
      title: isCall ? '📞 Incoming Voice Call' : notifType === 'match' ? '💞 New Match!' : '💬 New Message',
      body: record.content || record.message || (isCall ? 'Someone is calling you on UniLink!' : 'You have a new notification'),
      type: notifType,
      matchId: record.match_id || null,
      url: record.match_id ? `/chat/${record.match_id}` : '/',
      tag: `${notifType}-${userId}`
    };

    // Send push to all user devices
    const results = await Promise.allSettled(
      subs.map(sub => sendPush(sub.endpoint, sub.p256dh, sub.auth, notifPayload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent, total: subs.length }), { status: 200 });

  } catch (err) {
    console.error('Push function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
