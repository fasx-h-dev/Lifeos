import 'server-only'
import webpush from 'web-push'
import type { Database } from '@lifeos/db'
import { pushSubscriptionsRepo, notificationsRepo } from '@lifeos/db'

export function vapidConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  )
}

/**
 * Sends a real Web Push notification (service worker delivery, survives a closed tab —
 * unlike the in-tab Notification API). Reports the real outcome per subscription;
 * never claims success it didn't observe.
 */
export async function sendPushToUser(
  db: Database,
  userId: string,
  payload: { title: string; body?: string; url?: string }
): Promise<{ sent: number; failed: number }> {
  if (!vapidConfigured()) {
    await notificationsRepo.create(db, userId, { title: payload.title, body: payload.body, url: payload.url, channel: 'web_push', status: 'FAILED' })
    return { sent: 0, failed: 0 }
  }
  configureWebPush()
  const subs = await pushSubscriptionsRepo.list(db, userId)
  let sent = 0
  let failed = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sent += 1
    } catch {
      failed += 1
    }
  }
  await notificationsRepo.create(db, userId, {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    channel: 'web_push',
    status: sent > 0 ? 'SENT' : subs.length === 0 ? 'PENDING' : 'FAILED'
  })
  return { sent, failed }
}
