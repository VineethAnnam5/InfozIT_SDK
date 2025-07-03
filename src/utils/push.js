// push-notification-sdk/src/utils/push.js

import { urlB64ToUint8Array } from './base64';

/**
 * Subscribes the user to push notifications and sends the subscription to the backend.
 * @param {object} config - Configuration object from SDK init.
 * @param {ServiceWorkerRegistration} registration - The active service worker registration.
 */
export async function subscribeUser(config, registration) {
  // Ensure required config for subscription is present
  if (!config.applicationServerKey) {
    console.error('[PushSDK][subscribeUser] Missing applicationServerKey in config.');
    throw new Error('Application Server Key is required for subscription.');
  }
  if (!config.backendUrl) {
      console.error('[PushSDK][subscribeUser] Missing backendUrl in config. Subscription will not be saved.');
      throw new Error('Backend URL is required to save subscription.');
  }

  try {
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[PushSDK][subscribeUser] Existing push subscription found:', subscription);
      // Optional: Check if subscription needs to be re-sent (e.g., if userId changed)
      // For simplicity, we'll re-send if found, ensuring backend is always up-to-date.
      await sendSubscriptionToBackend(subscription, config.backendUrl, config.apiKey, config.userId);
      await sendWelcomeNotification(registration, config.welcomeIconPath);
      return subscription;
    }

    console.log('[PushSDK][subscribeUser] No existing subscription. Creating new subscription...');
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(config.applicationServerKey),
    };

    subscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('[PushSDK][subscribeUser] New push subscription created:', subscription);

    await sendSubscriptionToBackend(subscription, config.backendUrl, config.apiKey, config.userId);
    await sendWelcomeNotification(registration, config.welcomeIconPath);

    return subscription;

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.warn('[PushSDK][subscribeUser] Permission denied by user or browser policy.');
      throw new Error('Notification permission denied.');
    } else if (error.name === 'AbortError') {
      console.warn('[PushSDK][subscribeUser] Subscription process aborted (e.g., user closed prompt).');
      throw new Error('Subscription aborted.');
    } else {
      console.error('[PushSDK][subscribeUser] An unexpected error occurred during subscription:', error);
      throw error; // Re-throw to propagate
    }
  }
}

/**
 * Sends the PushSubscription object to your backend server.
 * @param {PushSubscription} subscription - The PushSubscription object.
 * @param {string} backendUrl - The URL of your backend endpoint to save subscriptions.
 * @param {string} [apiKey] - Optional API key for backend authentication.
 * @param {string} [userId] - Optional user ID to associate with the subscription.
 * @returns {Promise<any>} - The response data from the backend.
 */
export async function sendSubscriptionToBackend(subscription, backendUrl, apiKey, userId) {
  const dataToSend = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: subscription.toJSON().keys, // This includes p256dh and auth keys
    hostname: window.location.origin,
    userId: userId, // Pass userId from config
    // apiKey: apiKey // Include API Key in body if backend expects it this way
  };

  try {
    console.log('[PushSDK][sendSubscriptionToBackend] Sending data:', dataToSend);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      // Example: Add an Authorization header if your backend requires it
      // Adjust 'Bearer' token format as per your backend's authentication scheme
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
      const errorDetail = await response.text(); // Get more detail from response
      throw new Error(`Backend responded with status: ${response.status} - ${errorDetail}`);
    }

    const responseData = await response.json();
    console.log('[PushSDK][sendSubscriptionToBackend] Subscription saved successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('[PushSDK][sendSubscriptionToBackend] Error sending subscription to backend:', error);
    throw error; // Re-throw to propagate the error
  }
}

/**
 * Shows a welcome notification to the user.
 * @param {ServiceWorkerRegistration} registration - The active service worker registration.
 * @param {string} welcomeIconPath - Path to the icon for the welcome notification.
 */
export async function sendWelcomeNotification(registration, welcomeIconPath) {
  if (registration && 'Notification' in window) {
    try {
      await registration.showNotification('You’re All Set for Instant Alerts', {
        body: 'Thanks for enabling notifications. We\'ll keep you updated!We’ll keep you in the loop with updates, offers, and helpful tips — right when you need them.',
        icon: welcomeIconPath || '/welcome-icon.png', // Fallback to a common path
        tag: 'welcome-notification' // Use a tag to prevent multiple welcome notifications
      });
      console.log('[PushSDK][sendWelcomeNotification] Welcome notification shown.');
    } catch (error) {
      console.error('[PushSDK][sendWelcomeNotification] Failed to show welcome notification:', error);
    }
  } else {
    console.warn('[PushSDK][sendWelcomeNotification] Cannot show welcome notification: Service Worker or Notification API not available.');
  }
}