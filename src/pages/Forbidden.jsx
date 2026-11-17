import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeForRole, ROLE_LABELS } from '../lib/roles'

export default function Forbidden() {
  const { role } = useAuth()
  const home = homeForRole(role)

  return (
    <section className="mx-auto max-w-md text-center">
      <p className="text-5xl font-bold text-rose-600">403</p>
      <h1 className="mt-4 text-xl font-semibold">Not authorized</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your role{role ? ` (${ROLE_LABELS[role] ?? role})` : ''} doesn’t have access to
        this page.
      </p>
      <Link
        to={home}
        className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go to my home
      </Link>
    </section>
  )
}
