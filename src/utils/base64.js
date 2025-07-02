// push-notification-sdk/src/utils/base64.js

/**
 * Converts a URL-safe Base64 string to a Uint8Array.
 * Used for converting VAPID public keys.
 * @param {string} base64String - The Base64 URL-safe string.
 * @returns {Uint8Array} The converted Uint8Array.
 */
export function urlB64ToUint8Array(base64String) {
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