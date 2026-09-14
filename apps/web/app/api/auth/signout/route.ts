import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('sb-access-token')
  res.cookies.delete('lifeos_dev_user')
  return res
}
