// File: push-notification-sdk/src/index.js

import { subscribeUser } from './utils/push.js'; // Import push-related utilities
import { sendNotification, initializePushNotifications } from './api/index.js'; // Import the new sendNotification function from your API module

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


// Export the new sendNotification function to make it part of the SDK's public API
export { sendNotification, initializePushNotifications };
