self.addEventListener('push', (event) => {
  let data = { title: 'LifeOS', body: '' }
  try {
    data = event.data ? event.data.json() : data
  } catch {
    // ignore malformed payloads rather than throwing inside the push handler
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'LifeOS', {
      body: data.body || '',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
