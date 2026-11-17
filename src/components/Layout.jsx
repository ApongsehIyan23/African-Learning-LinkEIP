import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS, canAccess, ROLE_LABELS, ROLE_BADGE, isStaffRole } from '../lib/roles'
import Brand from './ui/Brand'
import Button from './ui/Button'
import Icon from './ui/Icon'

/* ---------- shared atoms --------------------------------------------------- */

function RoleBadge({ role }) {
  if (!role) return null
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        ROLE_BADGE[role] ?? 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function SidebarLink({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-btn px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-600 text-white shadow-card'
            : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} size={18} className={isActive ? 'text-white' : 'text-ink-subtle group-hover:text-ink'} />
          <span className="truncate">{item.label}</span>
          {item.count != null && (
            <span
              className={`ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-semibold tnum ${
                isActive ? 'bg-white/20 text-white' : 'bg-surface-2 text-ink-subtle'
              }`}
            >
              {item.count}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function TopLink({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
        ].join(' ')
      }
    >
      <Icon name={item.icon} size={16} />
      {item.label}
    </NavLink>
  )
}

function UserCard({ user, role, onSignOut, compact = false }) {
  return (
    <div className={compact ? 'flex items-center justify-between gap-2' : 'space-y-3'}>
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-subtle">{user?.email}</p>
        <div className="mt-1">
          <RoleBadge role={role} />
        </div>
      </div>
      <Button variant="secondary" size="sm" icon="logout" onClick={onSignOut} className={compact ? '' : 'w-full'}>
        Sign out
      </Button>
    </div>
  )
}

/* ---------- shells --------------------------------------------------------- */

function PublicShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-app text-ink">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand to="/" showText />
          <Button as={Link} to="/login" size="sm">Sign in</Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <AppFooter />
    </div>
  )
}

function MemberShell({ children, links, user, role, onSignOut }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col bg-app text-ink">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Brand to="/" showText onClick={() => setOpen(false)} />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((item) => <TopLink key={item.to} item={item} />)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <RoleBadge role={role} />
            <Button variant="secondary" size="sm" icon="logout" onClick={onSignOut}>Sign out</Button>
          </div>
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-btn text-ink-muted hover:bg-surface-2 md:hidden"
          >
            <Icon name={open ? 'x' : 'menu'} size={22} />
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map((item) => <TopLink key={item.to} item={item} onNavigate={() => setOpen(false)} />)}
              <div className="mt-2 border-t border-border pt-3">
                <UserCard user={user} role={role} onSignOut={onSignOut} compact />
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <AppFooter />
    </div>
  )
}

function SidebarShell({ children, links, user, role, onSignOut }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  const sidebarInner = (
    <>
      <div className="flex h-16 items-center border-b border-border px-5">
        <Brand to="/" showText onClick={close} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((item) => <SidebarLink key={item.to} item={item} onNavigate={close} />)}
      </nav>
      <div className="border-t border-border p-4">
        <UserCard user={user} role={role} onSignOut={onSignOut} />
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-app text-ink">
      {/* Fixed sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-border bg-surface lg:flex">
        {sidebarInner}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-btn text-ink-muted hover:bg-surface-2"
        >
          <Icon name="menu" size={22} />
        </button>
        <Brand to="/" />
        <RoleBadge role={role} />
      </header>

      {/* Mobile slide-over drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={close} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col border-r border-border bg-surface shadow-pop">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={close}
              className="focus-ring absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-btn text-ink-muted hover:bg-surface-2"
            >
              <Icon name="x" size={20} />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <AppFooter />
      </div>
    </div>
  )
}

function AppFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-ink-subtle sm:px-6">
        African Learning Link · Lajik Tech Ltd · MVP
      </div>
    </footer>
  )
}

/* ---------- entry: pick the shell by auth + role --------------------------- */

export default function Layout({ children }) {
  const { session, user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const links = NAV_ITEMS.filter((item) => canAccess(item.to, role))

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!session) return <PublicShell>{children}</PublicShell>

  const shellProps = { links, user, role, onSignOut: handleSignOut }
  return isStaffRole(role) ? (
    <SidebarShell {...shellProps}>{children}</SidebarShell>
  ) : (
    <MemberShell {...shellProps}>{children}</MemberShell>
  )
}
