// push-notification-sdk/src/index.js

import { subscribeUser } from './utils/push'; // Import push-related utilities

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
export async function init(config) {
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