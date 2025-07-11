import { subscribeUser } from '../utils/push';

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

export async function sendNotification(tokenDetails, keyDetails, notificationContent) {
    // here extract the

    const {
        endpoint,
        expirationTime,
        keys: { p256dh, auth },
        hostname,
        browser,
        country
    } = tokenDetails;

    if (!keyDetails) {
        throw new Error('Missing keyDetails');
    }
    // here check the key is valid or not and he has subscribed for web push
    const { notificationName, title, messagebody, image, icon } = notificationContent;
    sendDetailsToNBE(tokenDetails, keyDetails, notificationContent);
}

export async function sendDetailsToNBE(tokenDetails, keyDetails, notificationContent) {
    try {
        const response = await fetch('http://192.168.0.15:3030/api/pushtokens/sendToOnlyone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tokenDetails,
                keyDetails,
                notificationContent
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send to backend: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Notification sent to backend:', result);
        return result;

    } catch (error) {
        console.error('Error sending to backend:', error.message);
        throw error;
    }
}

const BACKEND_URL = 'http://192.168.0.15:3030/api/pushtokens/saveSubscription';
const VAPID_PUBLIC_KEY = 'BJxwPvagi4DFKyvW6Lo7m9f5Sdk8kxb0nMIbUYH4O1FGILXiImy41iHWexG2Kj9dorccY0Y6Z5qv2sf5KPS1Sxc';

/**
 * Initializes push notifications with fixed backend and server key.
* @param {{
 *   serviceWorkerUrl: string,
 *   onSuccess?: () => void,
 *   onError?: (error: Error) => void
 * }} config
 */
export async function initializePushNotifications(config) {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      await init({
        serviceWorkerUrl: config.serviceWorkerUrl,
        backendUrl: BACKEND_URL,
        applicationServerKey: VAPID_PUBLIC_KEY
      });
      config?.onSuccess?.('Push SDK initialized successfully!');
    } catch (error) {
      config?.onError?.(error);
    }
  } else {
    const err = new Error('Push notifications not supported in this browser.');
    config?.onError?.(err);
  }
}