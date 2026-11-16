// Shows a friend request or room invite pushed by the server; a tap opens where it points. No caching, no offline.

self.addEventListener("activate", (event) => {
  // Pages already open come under it at once, so a tap can move them.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Marvel Splendor", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      // The game already open: bring it forward and move it there, else open it.
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const tab = open.find((client) => new URL(client.url).origin === self.location.origin);
      if (tab) {
        await tab.focus();
        try {
          return await tab.navigate(url);
        } catch {
          // A page it doesn't control can't be moved; a new window can.
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
