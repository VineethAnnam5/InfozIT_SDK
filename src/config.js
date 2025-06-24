export const defaultConfig = {
  serviceWorkerUrl: '/service-worker.js',
  apiKey: '',
  userId: '',
  backendUrl: '', // your server endpoint
};

export function validateConfig(config) {
  return config.apiKey && config.userId && config.backendUrl;
}
