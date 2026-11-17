import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS, canAccess, ROLE_LABELS, ROLE_BADGE } from '../lib/roles'

function navClass({ isActive }) {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ')
}

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

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const { session, user, role, signOut } = useAuth()
  const navigate = useNavigate()

  const links = NAV_ITEMS.filter((item) => canAccess(item.to, role))

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              ALL
            </span>
            <span className="hidden text-base font-semibold tracking-tight sm:inline">
              African Learning Link
            </span>
          </Link>

          {/* Desktop / tablet nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side: auth state (desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            {session ? (
              <>
                <div className="flex flex-col items-end leading-tight">
                  <span className="max-w-[180px] truncate text-xs text-slate-600">
                    {user?.email}
                  </span>
                  <RoleBadge role={role} />
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navClass}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="mt-2 border-t border-slate-200 pt-3">
                {session ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col leading-tight">
                      <span className="max-w-[200px] truncate text-xs text-slate-600">
                        {user?.email}
                      </span>
                      <span className="mt-1">
                        <RoleBadge role={role} />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
          African Learning Link · Lajik Tech Ltd · MVP
        </div>
      </footer>
    </div>
  )
}
