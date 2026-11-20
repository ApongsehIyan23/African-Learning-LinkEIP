import { supabase } from './supabaseClient'

// Phase 2.5 — AI discovery assist (ALL_MVP_CONTEXT.md §6).
// The agent only finds candidates. The human confirms, and confirming inserts an
// ordinary opportunity at 'received' tagged source_method 'ai_agent'. The DB's
// after-insert trigger seeds the six criteria and logs the confirmation, so the
// item then flows through the exact same verification gates as a manual one.

export async function findOpportunities(params) {
  const { data, error } = await supabase.functions.invoke('ai-discovery', { body: params })
  if (error) {
    // Surface the function's own message where it sent one.
    let message = error.message || 'Search failed.'
    const res = error.context
    if (res && typeof res.clone === 'function') {
      try {
        const ctx = await res.clone().json()
        if (ctx?.error) message = ctx.error
        if (ctx?.detail) message += ` — ${ctx.detail}`
      } catch {
        try {
          const text = await res.clone().text()
          if (text) message = text.slice(0, 400)
        } catch {
          /* keep the generic message */
        }
      }
    }
    throw new Error(message)
  }
  return {
    candidates: data?.candidates ?? [],
    cached: Boolean(data?.cached),
    formatter: data?.formatter ?? null,
    formatterDetail: data?.formatterDetail ?? '',
  }
}

// Insert one confirmed candidate as an AI-sourced opportunity at 'received'.
export async function confirmAiOpportunity(candidate, userId) {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      title: candidate.title,
      provider: candidate.provider,
      type: candidate.type,
      source_link: candidate.source_link || null,
      deadline: candidate.deadline || null,
      summary: candidate.summary || null,
      eligibility: candidate.eligibility || null,
      application_link: candidate.application_link || null,
      geo_restrictions: candidate.geography || null,
      submitted_by: userId,
      source_method: 'ai_agent',
      current_status: 'received',
    })
    .select('id')
    .single()
  if (error) throw error
  return data
}

// Confirm several at once; returns how many were written.
export async function confirmAiOpportunities(candidates, userId) {
  let written = 0
  for (const c of candidates) {
    await confirmAiOpportunity(c, userId)
    written += 1
  }
  return written
}
