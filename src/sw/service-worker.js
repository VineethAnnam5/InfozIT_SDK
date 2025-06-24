// src/sw/service-worker.js

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Teksskillhub Local Update';

  const options = {
    body: data.body || 'You have a new notification!',
    icon: data.icon || '/icon.png',
    image: data.image || undefined,
    data: {
      ...data, // include userId, launchUrlId, url, etc.
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const payload = e.notification.data || {};
  const userId = payload.userId;
  const launchUrlId = payload.launchUrlId;
  const urlToOpen = payload.url || payload.clickUrl;

  const trackClickPromise = fetch('http://192.168.1.158:3050/api/pushtokens/updateclick', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      hasClicked: true,
      launchUrlId
    })
  }).then(response => {
    if (!response.ok) {
      console.error('Failed to hit updateclick API:', response.status, response.statusText);
    } else {
      console.log('Click tracked:', { userId, launchUrlId });
    }
  }).catch(error => {
    console.error('Error hitting updateclick API:', error);
  });

  const openUrlPromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clientList => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow && urlToOpen) {
        return clients.openWindow(urlToOpen);
      }
      return Promise.resolve();
    }).catch(error => {
      console.error('Error opening URL:', error);
    });

  e.waitUntil(Promise.allSettled([trackClickPromise, openUrlPromise]));
});
