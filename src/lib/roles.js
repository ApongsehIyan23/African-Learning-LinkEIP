// Role model for African Learning Link (ALL_MVP_CONTEXT.md §4).
// Route protection here is the UX layer; data access is additionally enforced
// by Supabase Row-Level Security in the database.

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  verification_lead: 'Verification Lead',
  submitter: 'Submitter',
  student_mentee: 'Student / Mentee',
  mentor: 'Mentor',
}

export const ROLE_BADGE = {
  super_admin: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  verification_lead: 'bg-sky-100 text-sky-800 border-sky-200',
  submitter: 'bg-teal-100 text-teal-800 border-teal-200',
  student_mentee: 'bg-amber-100 text-amber-800 border-amber-200',
  mentor: 'bg-rose-100 text-rose-800 border-rose-200',
}

// Where each role lands after login.
export const ROLE_HOME = {
  super_admin: '/dashboard',
  verification_lead: '/dashboard',
  submitter: '/verification',
  student_mentee: '/opportunities',
  mentor: '/opportunities',
}

// Which roles may reach each protected route.
export const ROUTE_ACCESS = {
  '/dashboard': ['super_admin', 'verification_lead'],
  '/verification': ['super_admin', 'verification_lead', 'submitter'],
  '/matching': ['super_admin', 'verification_lead'],
  '/opportunities': ['super_admin', 'verification_lead', 'submitter', 'student_mentee', 'mentor'],
}

// Nav links (rendered only for routes the current role can access).
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/verification', label: 'Verification Queue' },
  { to: '/matching', label: 'Mentor Matching' },
  { to: '/opportunities', label: 'Opportunities' },
]

export function homeForRole(role) {
  return ROLE_HOME[role] ?? '/opportunities'
}

export function canAccess(path, role) {
  const allowed = ROUTE_ACCESS[path]
  if (!allowed) return true
  return role ? allowed.includes(role) : false
}
