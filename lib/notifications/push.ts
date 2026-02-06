"use client"

export async function requestPushPermission(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return null
  }

  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })

  return subscription
}

export async function savePushSubscription(
  subscription: PushSubscription,
  userId: string
) {
  await fetch("/api/portal/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      user_id: userId,
    }),
  })
}
