// service-worker.js

// IMPORTANT: This URL MUST be replaced with your client's actual backend endpoint
// for tracking notification clicks.
// Make sure this is an HTTPS URL if your app is HTTPS.
const TRACKING_API_URL = 'https://YOUR_CLIENT_BACKEND_FOR_TRACKING.com/api/trackNotificationClick'; 

self.addEventListener('push', (event) => {
    // Check if the event has data. If not, log and return.
    if (!event.data) {
        console.warn('[Service Worker] Push event received without data. No notification will be shown.');
        return;
    }

    // Parse the incoming JSON data from the push event
    const payload = event.data.json();
    console.log('[Service Worker] Push event received with payload:', payload);

    // --- Extract data from your backend payload ---
    const title = payload.title || 'New Notification'; // Use backend title, fallback to default
    const body = payload.body || 'You have a new message.'; // Use backend body, fallback to default
    const icon = payload.icon; // Use backend icon URL
    const image = payload.image; // Use backend image URL for large image
    const mainClickUrl = payload.url || self.location.origin; // Main URL for notification click
    const notificationId = payload.notificationId || Date.now(); // Unique ID for this notification
    const userId = payload.userId; // Your user ID from the payload

    // Prepare action buttons from the 'buttons' array in your payload
    const actions = [];
    if (payload.buttons && Array.isArray(payload.buttons)) {
        payload.buttons.forEach(button => {
            if (button.actionId && button.buttonLabel) {
                actions.push({
                    action: button.actionId,       // Unique identifier for the action
                    title: button.buttonLabel,     // Text displayed on the button
                    icon: button.iconUrl || undefined, // Optional: icon for the button
                    // IMPORTANT: Store the launchUrl for the button here if needed in notificationclick
                    // A common pattern is to include it in the 'data' of the action,
                    // or in the main notification data along with the actionId.
                    // For simplicity, we'll retrieve it from the main payload.buttons in click handler.
                });
            }
        });
    }

    // Construct the notification options for showNotification()
    const options = {
        body: body,
        icon: icon,         // Small icon for the notification
        image: image,       // Large image displayed within the notification (if supported by browser/OS)
        badge: '/badge.png', // Optional: A small monochrome icon shown in the notification tray (Android)
        vibrate: [200, 100, 200], // Optional: Vibration pattern
        // The 'data' property holds custom data that will be accessible
        // when the notification is clicked.
        data: {
            notificationId: notificationId,
            mainClickUrl: mainClickUrl,
            userId: userId, // Pass userId for tracking
            trackingApiUrl: TRACKING_API_URL,
            // Pass the original buttons array so you can get launchUrl for action clicks
            originalButtons: payload.buttons 
        },
        tag: `notification-${notificationId}`, // Group notifications, useful for updating/replacing
        renotify: true, // Re-notify if a notification with the same tag exists
        requireInteraction: false, // Keep notification visible until dismissed/clicked (true for sticky)
        actions: actions    // Add your dynamic action buttons
    };

    // Show the notification. event.waitUntil keeps the service worker alive
    // until the notification is displayed.
    event.waitUntil(
        self.registration.showNotification(title, options)
        .then(() => {
            console.log('[Service Worker] Notification shown successfully:', title);
            // Optional: Send a 'notification received' tracking event to your backend here
        })
        .catch(error => {
            console.error('[Service Worker] Error showing notification:', error);
            // Log the options used to help debug if showNotification fails
            console.error('Notification options that failed:', options);
        })
    );
});

// Listener for notification clicks (You should already have this, but review it)
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Always close the notification after it's clicked

    const notificationData = event.notification.data;
    const clickedAction = event.action; // This is the 'action' ID of the button clicked, or '' for main body click
    
    const notificationId = notificationData.notificationId;
    const trackingUrl = notificationData.trackingApiUrl;
    const userId = notificationData.userId;
    const originalButtons = notificationData.originalButtons;

    console.log('[Service Worker] Notification clicked. Action:', clickedAction, 'Data:', notificationData);

    let launchUrl = notificationData.mainClickUrl; // Default to the main URL

    // Handle specific button clicks by finding the correct URL
    if (clickedAction && originalButtons && Array.isArray(originalButtons)) {
        const buttonClicked = originalButtons.find(btn => btn.actionId === clickedAction);
        if (buttonClicked && buttonClicked.launchUrl) {
            launchUrl = buttonClicked.launchUrl;
            console.log(`[Service Worker] Button '${buttonClicked.buttonLabel}' clicked. Opening: ${launchUrl}`);
        } else {
            console.warn(`[Service Worker] Clicked action '${clickedAction}' not found in original buttons or missing launchUrl. Defaulting to main URL.`);
        }
    } else {
        console.log(`[Service Worker] Main notification body clicked. Opening: ${launchUrl}`);
    }

    // --- Send Click Tracking to your backend ---
    if (trackingUrl && notificationId) {
        const trackData = {
            notificationId: notificationId,
            action: clickedAction || 'main_click', // 'main_click' if notification body was clicked
            userId: userId // Include userId if available
            // Add any other data you need to track (e.g., launchUrlId if critical)
        };

        event.waitUntil(
            fetch(trackingUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(trackData),
            })
            .then(response => {
                if (!response.ok) {
                    console.error('[Service Worker] Failed to send click tracking data:', response.statusText);
                } else {
                    console.log('[Service Worker] Notification click tracked successfully.');
                }
            })
            .catch(error => {
                console.error('[Service Worker] Error sending click tracking data:', error);
            })
            // Ensure the window opens even if tracking fails
            .finally(() => {
                // Open the URL after tracking (or attempting to track)
                // Use clients.openWindow to open in a new tab/window
                if (launchUrl) {
                    clients.openWindow(launchUrl);
                } else {
                    console.warn('[Service Worker] No URL to open for notification click.');
                }
            })
        );
    } else {
        // If no tracking URL, just open the window directly
        event.waitUntil(
            clients.openWindow(launchUrl)
        );
    }
});

// Optional: Listener for notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed:', event.notification.tag);
    // You could also send a tracking beacon to your backend here for notification dismissal
});

// Optional: Install and Activate listeners for Service Worker lifecycle
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(clients.claim()); // Makes the current service worker control all clients immediately
});