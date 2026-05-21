import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-space-900 text-fg">
      <Navbar />
      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  )
}
