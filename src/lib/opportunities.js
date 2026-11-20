import { supabase } from './supabaseClient'

// ---- Lifecycle states (ALL_MVP_CONTEXT.md §5.1) ----------------------------
export const STATUS_ORDER = [
  'received',
  'under_review',
  'verification_in_progress',
  'awaiting_information',
  'approved_for_publication',
  'published',
  'rejected',
  'expired_closed',
]

export const STATUS_LABEL = {
  received: 'Received',
  under_review: 'Under Review',
  verification_in_progress: 'Verification in Progress',
  awaiting_information: 'Awaiting Additional Information',
  approved_for_publication: 'Approved for Publication',
  published: 'Published',
  rejected: 'Rejected',
  expired_closed: 'Expired / Closed',
}

export const STATUS_BADGE = {
  received: 'bg-slate-100 text-slate-700 border-slate-200',
  under_review: 'bg-info-50 text-info-700 border-info-100',
  verification_in_progress: 'bg-brand-100 text-brand-700 border-brand-200',
  awaiting_information: 'bg-warning-50 text-warning-700 border-warning-100',
  approved_for_publication: 'bg-brand-50 text-brand-800 border-brand-100',
  published: 'bg-success-50 text-success-700 border-success-100',
  rejected: 'bg-error-50 text-error-700 border-error-100',
  expired_closed: 'bg-slate-200 text-slate-600 border-slate-300',
}

// Leading icon per status so state never relies on colour alone (colourblind-safe).
export const STATUS_ICON = {
  received: 'inbox',
  under_review: 'eye',
  verification_in_progress: 'shieldCheck',
  awaiting_information: 'clock',
  approved_for_publication: 'badgeCheck',
  published: 'globe',
  rejected: 'xCircle',
  expired_closed: 'archive',
}

// ---- Types (§8.2) ----------------------------------------------------------
export const TYPE_LABEL = {
  scholarship: 'Scholarship',
  course: 'Course',
  internship: 'Internship',
  job: 'Job',
  fellowship: 'Fellowship',
}
export const TYPE_OPTIONS = Object.keys(TYPE_LABEL)

// ---- Six criteria + paid scrutiny (§5.2) -----------------------------------
export const CRITERIA = [
  { key: 'authenticity', label: 'Authenticity', sop: '5.1' },
  { key: 'accuracy', label: 'Accuracy', sop: '5.2' },
  { key: 'relevance', label: 'Relevance', sop: '5.3' },
  { key: 'accessibility', label: 'Accessibility', sop: '5.4' },
  { key: 'completeness', label: 'Completeness', sop: '5.5' },
  { key: 'timeliness', label: 'Timeliness', sop: '5.6' },
  { key: 'paid_scrutiny', label: 'Paid-opportunity scrutiny', sop: '5.7' },
]
export const CORE_CRITERIA = CRITERIA.filter((c) => c.key !== 'paid_scrutiny').map((c) => c.key)

export const RESULT_LABEL = { unchecked: 'Unchecked', pass: 'Pass', flag: 'Flag', fail: 'Fail' }
export const RESULT_BADGE = {
  unchecked: 'bg-slate-100 text-slate-500 border-slate-200',
  pass: 'bg-success-50 text-success-700 border-success-100',
  flag: 'bg-warning-50 text-warning-700 border-warning-100',
  fail: 'bg-error-50 text-error-700 border-error-100',
}

// ---- Queries ---------------------------------------------------------------
const OPP_SELECT =
  '*, submitter:users!opportunities_submitted_by_fkey(id, full_name, email)'

export async function listOpportunities() {
  const { data, error } = await supabase
    .from('opportunities')
    .select(OPP_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getOpportunity(id) {
  const [oppRes, critRes, actRes] = await Promise.all([
    supabase.from('opportunities').select(OPP_SELECT).eq('id', id).single(),
    supabase
      .from('opportunity_criteria')
      .select('*, checker:users!opportunity_criteria_checked_by_fkey(full_name, email)')
      .eq('opportunity_id', id),
    supabase
      .from('opportunity_activity')
      .select('*, actor:users!opportunity_activity_actor_id_fkey(full_name, email)')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false }),
  ])
  if (oppRes.error) throw oppRes.error
  if (critRes.error) throw critRes.error
  if (actRes.error) throw actRes.error
  return { opportunity: oppRes.data, criteria: critRes.data ?? [], activity: actRes.data ?? [] }
}

export async function createOpportunity(fields, userId) {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title: fields.title,
      provider: fields.provider,
      type: fields.type,
      source_link: fields.source_link || null,
      deadline: fields.deadline || null,
      summary: fields.summary || null,
      eligibility: fields.eligibility || null,
      application_link: fields.application_link || null,
      geo_restrictions: fields.geo_restrictions || null,
      submitted_by: userId,
      source_method: 'manual',
      current_status: 'received',
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

// ---- RPC wrappers (the only path to change status) -------------------------
async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw error
  return data
}

export const startReview = (id) => rpc('opp_start_review', { p_opp: id })
export const startVerification = (id) => rpc('opp_start_verification', { p_opp: id })
export const setCriterion = (id, criterion, result, note) =>
  rpc('opp_set_criterion', { p_opp: id, p_criterion: criterion, p_result: result, p_note: note || null })
export const requestInfo = (id, note) => rpc('opp_request_info', { p_opp: id, p_note: note })
export const resume = (id) => rpc('opp_resume', { p_opp: id })
export const approve = (id) => rpc('opp_approve', { p_opp: id })
export const publish = (id) => rpc('opp_publish', { p_opp: id })
export const reject = (id, reason) => rpc('opp_reject', { p_opp: id, p_reason: reason })
export const markExpired = (id) => rpc('opp_mark_expired', { p_opp: id })
export const updateFields = (id, f) =>
  rpc('opp_update_fields', {
    p_opp: id,
    p_title: f.title,
    p_provider: f.provider,
    p_type: f.type,
    p_source_link: f.source_link || null,
    p_deadline: f.deadline || null,
    p_summary: f.summary || null,
    p_eligibility: f.eligibility || null,
    p_application_link: f.application_link || null,
    p_geo: f.geo_restrictions || null,
  })

// ---- Which actions a role may take at a given status (UI; DB also enforces) --
export function availableActions(status, role, isOwner) {
  const staff = role === 'super_admin' || role === 'verification_lead'
  const a = []
  if (status === 'received' && staff) a.push('start_review')
  if (status === 'under_review' && staff) a.push('start_verification')
  if (status === 'verification_in_progress' && staff) a.push('approve')
  if ((status === 'under_review' || status === 'verification_in_progress') && staff) a.push('request_info')
  if (status === 'awaiting_information' && (staff || isOwner)) a.push('resume')
  if (status === 'approved_for_publication' && staff) a.push('publish')
  if (staff && !['published', 'rejected', 'expired_closed'].includes(status)) a.push('reject')
  if (staff && (status === 'published' || status === 'approved_for_publication')) a.push('mark_expired')
  if (isOwner && (status === 'received' || status === 'under_review')) a.push('edit')
  return a
}

export function canEditCriteria(status, role) {
  const staff = role === 'super_admin' || role === 'verification_lead'
  return staff && ['under_review', 'verification_in_progress', 'awaiting_information'].includes(status)
}
