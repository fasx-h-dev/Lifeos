import { NextResponse } from 'next/server'

export async function GET() {
  if (!process.env.VAPID_PUBLIC_KEY) {
    return NextResponse.json({ configured: false }, { status: 200 })
  }
  return NextResponse.json({ configured: true, publicKey: process.env.VAPID_PUBLIC_KEY })
}
