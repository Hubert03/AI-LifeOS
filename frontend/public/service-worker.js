self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title || 'LifeOS reminder', {
      body: payload.body || 'Your reminder is ready.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `reminder-${payload.reminderId}`,
      renotify: true,
      data: {
        reminderId: payload.reminderId,
        url: payload.url || '/reminders',
      },
      actions: [
        { action: 'snooze', title: 'Snooze' },
        { action: 'stop', title: 'Stop' },
      ],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { reminderId, url } = event.notification.data || {};
  const targetUrl = new URL(url || '/reminders', self.location.origin);
  if (targetUrl.origin !== self.location.origin) targetUrl.href = new URL('/reminders', self.location.origin).href;
  if (reminderId) targetUrl.searchParams.set('triggered', reminderId);
  if (event.action === 'snooze' || event.action === 'stop') {
    targetUrl.searchParams.set('action', event.action);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
      return existing ? existing.navigate(targetUrl.href).then(() => existing.focus()) : self.clients.openWindow(targetUrl.href);
    }),
  );
});
