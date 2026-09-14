import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LifeOS',
  description: 'Your personal AI operating system'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
