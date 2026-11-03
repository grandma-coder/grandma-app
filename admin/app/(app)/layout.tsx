import { CommandCenterSidebar } from "@/components/CommandCenterSidebar"

/**
 * Authed app shell — the "Central" layout: persistent sidebar + content area.
 * Wraps every dashboard route (everything except /sign-in and /api). The Clerk
 * gate (proxy.ts) already guarantees a session before this renders.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="central-app">
      <CommandCenterSidebar />
      <div className="central-content">{children}</div>
    </div>
  )
}
