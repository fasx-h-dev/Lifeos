import { redirect } from 'next/navigation'
import { getAuthedUser } from '@/lib/auth'
import NavBar from '@/components/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthedUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      <NavBar email={user.email} />
      <main className="p-4 md:p-8 max-w-6xl mx-auto">{children}</main>
    </div>
  )
}
