import { supabase } from './supabase';

// ── VAPID Public Key (Replace with your key from web-push or vapidkeys.com) ──
// Generate: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported on this browser.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('✅ Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('❌ Service Worker registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(userId: string) {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VAPID public key not configured. Skipping push subscription.');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    const keyArray = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer
    });

    // Save subscription to Supabase push_subscriptions table
    const subJson = subscription.toJSON();
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    console.log('✅ Push subscription saved for user:', userId);
  } catch (err) {
    console.warn('Push subscription failed (user may have denied permission):', err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}
