import { subscribeUser } from './utils/push';

window.pushSDK = {
  init: async function (config) {
    if (!config?.serviceWorkerUrl || !config?.backendUrl) {
      console.error('[PushSDK] Missing required config');
      return;
    }

    try {
      await navigator.serviceWorker.register(config.serviceWorkerUrl);
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        await subscribeUser(config);
      } else {
        console.warn('[PushSDK] Notification permission denied');
      }
    } catch (err) {
      console.error('[PushSDK] Error in init:', err);
    }
  },
};
