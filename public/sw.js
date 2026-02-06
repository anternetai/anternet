// Service Worker for Push Notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}

  const options = {
    body: data.body || "You have a new notification",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: data.url || "/portal/dashboard",
    },
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "HomeField Hub",
      options
    )
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/portal/dashboard"

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/portal") && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
