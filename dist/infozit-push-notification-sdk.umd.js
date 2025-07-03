(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.InfozitPushSDK = {}));
})(this, (function (exports) { 'use strict';

  // push-notification-sdk/src/utils/base64.js

  /**
   * Converts a URL-safe Base64 string to a Uint8Array.
   * Used for converting VAPID public keys.
   * @param {string} base64String - The Base64 URL-safe string.
   * @returns {Uint8Array} The converted Uint8Array.
   */
  function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+') // Replace - with +
      .replace(/_/g, '/'); // Replace _ with /

    const rawData = window.atob(base64); // Decode Base64 string
    const outputArray = new Uint8Array(rawData.length);

    // Populate Uint8Array with character codes
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // push-notification-sdk/src/utils/push.js


  /**
   * Subscribes the user to push notifications and sends the subscription to the backend.
   * @param {object} config - Configuration object from SDK init.
   * @param {ServiceWorkerRegistration} registration - The active service worker registration.
   */
  async function subscribeUser(config, registration) {
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
  async function sendSubscriptionToBackend(subscription, backendUrl, apiKey, userId) {
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
  async function sendWelcomeNotification(registration, welcomeIconPath) {
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

  // push-notification-sdk/src/index.js


  /**
   * Initializes the InfozIT Push Notification SDK.
   * This function handles service worker registration, notification permission requests,
   * and push subscription management.
   *
   * @param {object} config - Configuration object for the SDK.
   * @param {string} config.serviceWorkerUrl - The relative or absolute URL to the `service-worker.js` file.
   * (e.g., '/service-worker.js' if copied to app's public folder)
   * @param {string} config.backendUrl - The URL of your backend endpoint where push subscriptions will be saved.
   * (e.g., 'https://your-api.com/api/pushtokens/subscribe')
   * @param {string} config.applicationServerKey - Your VAPID public key, as a Base64 URL-safe string.
   * @param {string} [config.apiKey] - Optional: Your API key for authentication with your backend.
   * @param {string} [config.userId] - Optional: A unique identifier for the current user.
   * @param {string} [config.welcomeIconPath='/welcome-icon.png'] - Optional: Path to the icon for the welcome notification.
   */
  async function init(config) {
    console.log('[PushSDK] InfozIT SDK Initialization Started.', config);

    // --- Input Validation ---
    if (!config || !config.serviceWorkerUrl || !config.backendUrl || !config.applicationServerKey) {
      console.error('[PushSDK] Initialization failed: Missing required configuration parameters. ' +
                    'Ensure serviceWorkerUrl, backendUrl, and applicationServerKey are provided.');
      return;
    }

    // --- Browser Compatibility Checks ---
    if (!('serviceWorker' in navigator)) {
      console.warn('[PushSDK] Service Workers are not supported in this browser. Push notifications will not work.');
      return;
    }
    if (!('PushManager' in window)) {
      console.warn('[PushSDK] Push API is not supported in this browser. Push notifications will not work.');
      return;
    }
    if (!('Notification' in window)) {
      console.warn('[PushSDK] Notification API is not supported in this browser. Push notifications will not work.');
      return;
    }

    try {
      // 1. Register the Service Worker
      console.log(`[PushSDK] Registering service worker from: ${config.serviceWorkerUrl}`);
      const registration = await navigator.serviceWorker.register(config.serviceWorkerUrl, { scope: '/' });
      console.log('[PushSDK] Service Worker registration successful:', registration);

      // 2. Request Notification Permission
      // This will prompt the user if permission is 'default' or has never been requested.
      // If 'granted' or 'denied', it will resolve immediately with that status.
      console.log('[PushSDK] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[PushSDK] Notification permission status:', permission);

      if (permission === 'granted') {
        // 3. Subscribe the User to Push Notifications (or get existing subscription)
        console.log('[PushSDK] Permission granted. Attempting to subscribe user...');
        await subscribeUser(config, registration); // Pass config and registration to subscribeUser

        console.log('[PushSDK] InfozIT SDK Initialization Completed Successfully.');
      } else if (permission === 'denied') {
        console.warn('[PushSDK] Notification permission explicitly denied by user. Cannot subscribe.');
        // Optionally send an event to your analytics that permission was denied
      } else { // 'default' or unrecognized
        console.warn('[PushSDK] Notification permission not granted. User did not allow or dismissed the prompt.');
      }

    } catch (error) {
      // Centralized error handling for the init process
      if (error.name === 'NotAllowedError' || error.message === 'Notification permission denied.') {
        console.error('[PushSDK] Initialization Error: User blocked notifications.', error);
      } else if (error.name === 'AbortError' || error.message === 'Subscription aborted.') {
        console.warn('[PushSDK] Initialization Warning: Subscription process was cancelled.', error);
      } else {
        console.error('[PushSDK] An unexpected error occurred during SDK initialization:', error);
      }
    }
  }

  exports.init = init;

}));
//# sourceMappingURL=infozit-push-notification-sdk.umd.js.map
