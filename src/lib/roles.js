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
  super_admin: 'bg-brand-100 text-brand-700 border-brand-200',
  verification_lead: 'bg-info-50 text-info-700 border-info-100',
  submitter: 'bg-success-50 text-success-700 border-success-100',
  student_mentee: 'bg-warning-50 text-warning-700 border-warning-100',
  mentor: 'bg-error-50 text-error-700 border-error-100',
}

// Staff/operational roles get the sidebar app shell; platform users (students,
// mentors) get the lighter top-bar shell. (ALL_MVP_CONTEXT.md §4.1 / §4.2)
export const STAFF_ROLES = ['super_admin', 'verification_lead', 'submitter']
export function isStaffRole(role) {
  return STAFF_ROLES.includes(role)
}

// Where each role lands after login.
export const ROLE_HOME = {
  super_admin: '/dashboard',
  verification_lead: '/dashboard',
  submitter: '/verification',
  student_mentee: '/opportunities',
  mentor: '/mentorship',
}

// Which roles may reach each protected route.
export const ROUTE_ACCESS = {
  '/dashboard': ['super_admin', 'verification_lead'],
  '/verification': ['super_admin', 'verification_lead', 'submitter'],
  '/matching': ['super_admin', 'verification_lead'],
  '/mentorship': ['student_mentee', 'mentor', 'super_admin'],
  '/opportunities': ['super_admin', 'verification_lead', 'submitter', 'student_mentee'],
}

// Nav links (rendered only for routes the current role can access).
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/verification', label: 'Verification Queue', icon: 'listChecks' },
  { to: '/matching', label: 'Mentor Matching', icon: 'users' },
  { to: '/mentorship', label: 'Mentorship', icon: 'userPlus' },
  { to: '/opportunities', label: 'Opportunities', icon: 'compass' },
]

export function homeForRole(role) {
  return ROLE_HOME[role] ?? '/opportunities'
}

export function canAccess(path, role) {
  const allowed = ROUTE_ACCESS[path]
  if (!allowed) return true
  return role ? allowed.includes(role) : false
}
