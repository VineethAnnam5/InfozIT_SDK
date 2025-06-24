import { urlB64ToUint8Array } from './base64';

const applicationServerKey = "BJxwPvagi4DFKyvW6Lo7m9f5Sdk8kxb0nMIbUYH4O1FGILXiImy41iHWexG2Kj9dorccY0Y6Z5qv2sf5KPS1Sxc";

export async function subscribeUser(config) {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(applicationServerKey),
        });
      }

      await sendSubscriptionToBackend(subscription, config.backendUrl);
      await sendWelcomeNotification();
    } catch (error) {
      console.error('[PushSDK] Subscription error:', error);
    }
  } else {
    console.warn('[PushSDK] Push messaging not supported');
  }
}

async function sendSubscriptionToBackend(subscription, backendUrl) {
  const dataToSend = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: subscription.toJSON().keys,
    hostname: window.location.origin,
  };

  try {
    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });

    if (!res.ok) throw new Error(`Status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[PushSDK] Error sending to backend:', err);
    throw err;
  }
}

async function sendWelcomeNotification() {
  const registration = await navigator.serviceWorker.ready;
  registration.showNotification('Welcome to Teksskillhub!', {
    body: 'Thanks for enabling notifications. We\'ll keep you updated!',
    icon: '/path/to/your/welcome-icon.png',
    tag: 'welcome-notification',
  });
}
