// service-worker.js

// IMPORTANT: This URL MUST be replaced with your client's actual backend endpoint
// for tracking notification clicks.
// Make sure this is an HTTPS URL if your app is HTTPS.
const TRACKING_API_URL = 'http://localhost:3050/api/pushtokens/updateclick'; 

self.addEventListener('push', (event) => {
    if (!event.data) {
        console.warn('[Service Worker] Push event received without data. No notification will be shown.');
        return;
    }

    const payload = event.data.json();
    console.log('[Service Worker] Push event received with payload:', payload);

    const title = payload.title || 'New Notification';
    const body = payload.body || 'You have a new message.';
    const icon = payload.icon;
    const image = payload.image;
    const mainClickUrl = payload.url || self.location.origin;
    const notificationId = payload.notificationId || Date.now();
    const userId = payload.userId; // ✅ Added userId
    const launchUrlId = payload.launchUrlId; // ✅ Optional if it's in main payload

    const actions = [];
    if (payload.buttons && Array.isArray(payload.buttons)) {
        payload.buttons.forEach(button => {
            if (button.actionId && button.buttonLabel) {
                actions.push({
                    action: button.actionId,
                    title: button.buttonLabel,
                    icon: button.iconUrl || undefined,
                    // You can optionally store launchUrlId per button too
                    // by including it in the main data (done below)
                });
            }
        });
    }

    const options = {
        body: body,
        icon: icon,
        image: image,
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: {
            notificationId: notificationId,
            mainClickUrl: mainClickUrl,
            userId: userId, // ✅ Added here
            launchUrlId: launchUrlId, // ✅ Optional main notification launchUrlId
            trackingApiUrl: TRACKING_API_URL,
            hasClicked: true,
            originalButtons: payload.buttons // keep original to extract button-specific launchUrl or launchUrlId
        },
        tag: `notification-${notificationId}`,
        renotify: true,
        requireInteraction: false,
        actions: actions
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => {
                console.log('[Service Worker] Notification shown successfully:', title);
            })
            .catch(error => {
                console.error('[Service Worker] Error showing notification:', error);
                console.error('Notification options that failed:', options);
            })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notificationData = event.notification.data;
    const clickedAction = event.action;
    
    const notificationId = notificationData.notificationId;
    const trackingUrl = notificationData.trackingApiUrl;
    const userId = notificationData.userId; // ✅ Added
    const originalButtons = notificationData.originalButtons;
    const launchUrlId = notificationData.launchUrlId; // ✅ Added
    const hasClicked = notificationData.hasClicked; // ✅ Added

    console.log('[Service Worker] Notification clicked. Action:', clickedAction, 'Data:', notificationData);

    let launchUrl = notificationData.mainClickUrl;

    if (clickedAction && originalButtons && Array.isArray(originalButtons)) {
        const buttonClicked = originalButtons.find(btn => btn.actionId === clickedAction);
        if (buttonClicked && buttonClicked.launchUrl) {
            launchUrl = buttonClicked.launchUrl;
            // ✅ If each button has launchUrlId, you could override here
            if (buttonClicked.launchUrlId) {
                notificationData.launchUrlId = buttonClicked.launchUrlId;
            }
            console.log(`[Service Worker] Button '${buttonClicked.buttonLabel}' clicked. Opening: ${launchUrl}`);
        } else {
            console.warn(`[Service Worker] Clicked action '${clickedAction}' not found in original buttons or missing launchUrl. Defaulting to main URL.`);
        }
    } else {
        console.log(`[Service Worker] Main notification body clicked. Opening: ${launchUrl}`);
    }

    if (trackingUrl && notificationId) {
        const trackData = {
            notificationId: notificationId,
            action: clickedAction || 'main_click',
            userId: userId, // ✅ Send to backend
            launchUrlId: notificationData.launchUrlId, // ✅ Send to backend
            hasClicked: notificationData.hasClicked // ✅ Send to backend
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
            .finally(() => {
                if (launchUrl) {
                    clients.openWindow(launchUrl);
                } else {
                    console.warn('[Service Worker] No URL to open for notification click.');
                }
            })
        );
    } else {
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