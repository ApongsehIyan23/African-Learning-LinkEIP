import { supabase } from './supabaseClient'

// ---- Six matching criteria + SOP priorities/weights (§5.5) -----------------
// Proposed default: High ×2, Medium ×1. Per-criterion scores are stored so the
// weighted total is always derivable and the method can change without data loss.
export const MATCH_CRITERIA = [
  { key: 'goals', label: 'Career goals', priority: 'High', weight: 2 },
  { key: 'skills', label: 'Relevant skills & experience', priority: 'High', weight: 2 },
  { key: 'availability', label: 'Availability', priority: 'High', weight: 2 },
  { key: 'field', label: 'Industry or field', priority: 'Medium', weight: 1 },
  { key: 'interests', label: 'Interests & preferences', priority: 'Medium', weight: 1 },
  { key: 'language', label: 'Language', priority: 'Medium', weight: 1 },
]

// ---- 8-state matching lifecycle (§5.4) -------------------------------------
export const MATCHING_STATUS_LABEL = {
  registered: 'Registered',
  profile_incomplete: 'Profile Incomplete',
  ready_to_match: 'Ready to Match',
  searching: 'Searching',
  recommended: 'Recommended',
  declined: 'Declined',
  connected: 'Connected / Scheduled',
  active: 'Active / Monitoring',
}

export const MATCHING_STATUS_BADGE = {
  registered: 'bg-slate-100 text-slate-700 border-slate-200',
  profile_incomplete: 'bg-warning-50 text-warning-700 border-warning-100',
  ready_to_match: 'bg-info-50 text-info-700 border-info-100',
  searching: 'bg-info-50 text-info-700 border-info-100',
  recommended: 'bg-brand-100 text-brand-700 border-brand-200',
  declined: 'bg-slate-200 text-slate-600 border-slate-300',
  connected: 'bg-brand-50 text-brand-800 border-brand-100',
  active: 'bg-success-50 text-success-700 border-success-100',
}

export const MATCH_STATUS_LABEL = {
  recommended: 'Recommended',
  declined: 'Declined',
  connected: 'Connected',
  active: 'Active',
}

// ---- Transparent scoring (deterministic token overlap, no LLM) -------------
function tokens(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .split(/[,;/|]+|\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1),
  )
}
function jaccard(a, b) {
  const A = tokens(a)
  const B = tokens(b)
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const union = A.size + B.size - inter
  return union ? inter / union : 0
}
function anyOverlap(a, b) {
  const A = tokens(a)
  const B = tokens(b)
  for (const x of A) if (B.has(x)) return 1
  return 0
}
function round2(n) {
  return Math.round(n * 100) / 100
}

export function scoreMentor(mentee, mentor) {
  const raw = {
    goals: jaccard(mentee.career_goals, `${mentor.career_goals ?? ''} ${mentor.skills ?? ''} ${mentor.field ?? ''}`),
    skills: jaccard(`${mentee.skills ?? ''} ${mentee.experience ?? ''}`, `${mentor.skills ?? ''} ${mentor.experience ?? ''}`),
    availability: jaccard(mentee.availability, mentor.availability),
    field:
      mentee.field && mentor.field && mentee.field.trim().toLowerCase() === mentor.field.trim().toLowerCase()
        ? 1
        : jaccard(mentee.field, mentor.field),
    interests: jaccard(mentee.interests, mentor.interests),
    language: anyOverlap(mentee.languages, mentor.languages),
  }
  const breakdown = MATCH_CRITERIA.map((c) => ({ ...c, score: round2(raw[c.key] ?? 0) }))
  const wsum = breakdown.reduce((a, c) => a + c.weight, 0)
  const total = breakdown.reduce((a, c) => a + c.score * c.weight, 0) / wsum
  return { total: round2(total), percent: Math.round(total * 100), breakdown }
}

export function toScoresPayload(breakdown) {
  return breakdown.map((c) => ({ criterion: c.key, score: c.score, weight: c.weight }))
}

export const MENTEE_COMPLETE = (p) =>
  !!(p?.field && p?.career_goals && p?.skills && p?.availability && p?.languages)
export const MENTOR_COMPLETE = (p) =>
  !!(p?.field && p?.career_goals && p?.skills && p?.availability && p?.languages && p?.capacity >= 1)

// ---- Member queries --------------------------------------------------------
export async function getMyMenteeProfile(userId) {
  const { data, error } = await supabase.from('mentee_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}
export async function getMyMentorProfile(userId) {
  const { data, error } = await supabase.from('mentor_profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

async function rpc(name, params) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) throw error
  return data
}

export const saveMenteeProfile = (f) =>
  rpc('mm_save_mentee_profile', {
    p_field: f.field, p_goals: f.career_goals, p_skills: f.skills, p_experience: f.experience || null,
    p_languages: f.languages, p_availability: f.availability, p_interests: f.interests || null,
  })
export const saveMentorProfile = (f) =>
  rpc('mm_save_mentor_profile', {
    p_field: f.field, p_goals: f.career_goals, p_skills: f.skills, p_experience: f.experience || null,
    p_languages: f.languages, p_availability: f.availability, p_interests: f.interests || null,
    p_capacity: Number(f.capacity) || 1,
  })

export const myMatch = () => rpc('mm_my_match', {})
export const acceptMatch = (id) => rpc('mm_accept', { p_match: id })
export const declineMatch = (id) => rpc('mm_decline', { p_match: id })
export const submitFeedback = (id, rating, comment) =>
  rpc('mm_feedback', { p_match: id, p_rating: rating, p_comment: comment || null })

// ---- Staff queries ---------------------------------------------------------
// mentor_profiles has TWO FKs to users (user_id + verified_by), so the embed must
// name the one we want, or PostgREST can't disambiguate.
const MENTOR_SELECT = '*, user:users!mentor_profiles_user_id_fkey(full_name, email)'
const MENTEE_SELECT = '*, user:users!mentee_profiles_user_id_fkey(full_name, email)'

export async function listMentors() {
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(MENTOR_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function listMentees() {
  const { data, error } = await supabase
    .from('mentee_profiles')
    .select(MENTEE_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function listMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select(
      '*, mentee:mentee_profiles(field, user:users!mentee_profiles_user_id_fkey(full_name, email)), mentor:mentor_profiles(field, user:users!mentor_profiles_user_id_fkey(full_name, email))',
    )
    .order('recommended_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export const verifyMentor = (id) => rpc('mm_verify_mentor', { p_mentor: id })
export const recommendMatch = (menteeId, mentorId, breakdown) =>
  rpc('mm_recommend', { p_mentee: menteeId, p_mentor: mentorId, p_scores: toScoresPayload(breakdown) })
