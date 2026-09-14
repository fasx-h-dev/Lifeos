'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/school', label: 'School' },
  { href: '/study', label: 'Study' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/crm', label: 'Business' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/audit', label: 'Control Room' },
  { href: '/settings', label: 'Settings' }
]

export default function NavBar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.replace('/login')
  }

  return (
    <nav className="bg-white shadow px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1 rounded text-sm ${pathname?.startsWith(l.href) ? 'bg-indigo-100 text-indigo-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{email}</span>
        <button onClick={signOut} className="text-sm text-red-600">
          Sign out
        </button>
      </div>
    </nav>
  )
}
