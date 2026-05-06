/**
 * Firebase Cloud Messaging service worker.
 *
 * Required to be at /firebase-messaging-sw.js for the Firebase Web SDK to
 * pick it up. Edit the firebaseConfig values below to match your Firebase
 * project, OR keep them blank and rely on the runtime initialization done
 * inside src/lib/fcm.ts (the SDK reuses the running registration once it
 * matches the SW's scope).
 *
 * Background message handler in this file fires when a push lands while
 * the page is closed/backgrounded; foreground messages are handled by
 * `onMessage` in src/lib/fcm.ts.
 */

importScripts(
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js',
);

// These values are public-by-design (Firebase enforces auth via security rules,
// not via secrecy of the API key). Replace with your project's values OR leave
// blank and have src/lib/fcm.ts call initializeApp() from the page bundle.
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  messagingSenderId: '',
  appId: '',
};

if (firebaseConfig.apiKey) {
  // eslint-disable-next-line no-undef
  firebase.initializeApp(firebaseConfig);
  // eslint-disable-next-line no-undef
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {};
    if (!title) return;
    self.registration.showNotification(title, {
      body: body || '',
      icon: '/favicon.ico',
      data: payload.data || {},
    });
  });
}

// Open the relevant URL when a push notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard/inbox';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.endsWith(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    }),
  );
});
