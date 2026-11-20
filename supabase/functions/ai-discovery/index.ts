// African Learning Link — Phase 2.5 AI discovery assist (ALL_MVP_CONTEXT.md §6)
//
// ONE Edge Function. Discovery only: it searches a curated allowlist and returns
// clean candidates. It NEVER writes opportunities, verifies, approves, or
// publishes — the human confirms, and the submitter's own insert (status
// 'received', source_method 'ai_agent') is what creates the queue item.
//
// Secrets (set with `supabase secrets set`, never in git / frontend):
//   TAVILY_API_KEY, GEMINI_API_KEY
// Auto-provided by the platform: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const TAVILY_KEY = Deno.env.get('TAVILY_API_KEY') ?? ''
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours (§6 caveats)
const OPP_TYPES = ['scholarship', 'course', 'internship', 'job', 'fellowship']

// Focus the search on the two portals with the most consistent opportunity
// structure. The rest stay in trusted_sources (and still validate URLs) but are
// not searched for now — change this list to widen the net later.
const FOCUS_DOMAINS = ['opportunitiesforafricans.com', 'opportunitydesk.org']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type TavilyResult = { title: string; url: string; content?: string; raw_content?: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function hostTrusted(url: string, domains: string[]): boolean {
  const h = hostOf(url)
  return domains.some((d) => h === d || h.endsWith('.' + d))
}

// Pull every http(s) URL out of page text, so we can verify an apply link really
// appears on the page (the model can never invent one).
function urlsInText(text: string): string[] {
  return (text.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? []).map((u) => u.replace(/[.,;:)\]]+$/, ''))
}

function normalizeDeadline(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function isExpired(deadline: string | null): boolean {
  if (!deadline) return false // unknown — keep it, the submitter verifies
  const d = new Date(deadline + 'T23:59:59')
  if (isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function extractJson(text: string): { opportunities?: Array<Record<string, unknown>> } {
  let s = text.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1]
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  return JSON.parse(s)
}

// Ask the key which models it can actually use for generateContent.
async function listGenModels(key: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1000`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const body = await res.json()
    return (body.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes('generateContent'),
      )
      .map((m: { name?: string }) => String(m.name ?? '').replace(/^models\//, ''))
  } catch {
    return []
  }
}

// Rank usable text models best-first (prefer stable Flash, then Gemma).
function rankModels(models: string[]): string[] {
  const bad = /(embedding|aqa|vision|image|tts|audio|live|thinking|exp-|learnlm)/i
  const score = (m: string) => {
    if (/^gemini-2\.0-flash(-00\d)?$/.test(m)) return 100
    if (/^gemini-2\.5-flash$/.test(m)) return 95
    if (/^gemma-3-27b/.test(m)) return 90
    if (/^gemma-3-12b/.test(m)) return 85
    if (/^gemma-3/.test(m)) return 80
    if (/^gemini-1\.5-flash/.test(m)) return 70
    if (/flash/.test(m)) return 60
    if (/gemma/.test(m)) return 50
    return 10
  }
  return models.filter((m) => !bad.test(m)).sort((a, b) => score(b) - score(a))
}

function inferType(typeParam: string, text: string): string {
  const t = (typeParam || '').toLowerCase()
  if (OPP_TYPES.includes(t)) return t
  const s = text.toLowerCase()
  if (/\b(fellowship|fellow)\b/.test(s)) return 'fellowship'
  if (/\b(internship|intern)\b/.test(s)) return 'internship'
  if (/\b(course|training|bootcamp|certificate|programme)\b/.test(s)) return 'course'
  if (/\b(job|vacancy|hiring|position|recruit)\b/.test(s)) return 'job'
  return 'scholarship'
}

function findDeadline(content: string): string | null {
  const m = content.match(
    /(?:deadline|closing date|apply before|application deadline)[^0-9A-Za-z]{0,14}([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2})/i,
  )
  return m ? normalizeDeadline(m[1]) : null
}

// Best-effort apply link from page text: the URL nearest an "apply" cue.
function findApplyLink(content: string, portalUrl: string): string | null {
  const strip = (u: string) => u.replace(/\/+$/, '').toLowerCase()
  const portal = strip(portalUrl)
  const apply = urlsInText(content).find(
    (u) => /(apply|application|register|submit)/i.test(u) && strip(u) !== portal,
  )
  return apply ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!TAVILY_KEY || !GEMINI_KEY) {
    return json({ error: 'Server is missing TAVILY_API_KEY or GEMINI_API_KEY.' }, 500)
  }

  try {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // --- 1. Authenticate + authorize -------------------------------------------
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Not authenticated.' }, 401)
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: 'Not authenticated.' }, 401)
  const { data: profile } = await admin.from('users').select('role').eq('id', userData.user.id).maybeSingle()
  if (!profile || !['submitter', 'super_admin'].includes(profile.role)) {
    return json({ error: 'Only submitters may use the discovery assist.' }, 403)
  }

  // --- 2. Parameters ----------------------------------------------------------
  let params: Record<string, string> = {}
  try {
    params = await req.json()
  } catch {
    return json({ error: 'Invalid request body.' }, 400)
  }
  const type = (params.type ?? '').trim()
  const field = (params.field ?? '').trim()
  const geography = (params.geography ?? '').trim()
  const keywords = (params.keywords ?? '').trim()
  if (!keywords && !field && !type) {
    return json({ error: 'Enter at least a keyword, field, or type to search.' }, 400)
  }

  // --- 3. Cache check ---------------------------------------------------------
  const queryKey = JSON.stringify({ type, field, geography, keywords }).toLowerCase()
  const nowIso = new Date().toISOString()
  const { data: cached } = await admin
    .from('search_cache')
    .select('results')
    .eq('query_key', queryKey)
    .gt('expires_at', nowIso)
    .maybeSingle()
  if (cached) return json({ candidates: cached.results, cached: true, formatter: 'cached' })

  // --- 4. Allowlist + focus ---------------------------------------------------
  const { data: sources } = await admin.from('trusted_sources').select('domain, name').eq('active', true)
  const domains = (sources ?? []).map((s: { domain: string }) => s.domain.toLowerCase())
  const nameByDomain = new Map(
    (sources ?? []).map((s: { domain: string; name: string }) => [s.domain.toLowerCase(), s.name]),
  )
  const providerForUrl = (url: string) => {
    const h = hostOf(url)
    for (const [d, n] of nameByDomain) if (h === d || h.endsWith('.' + d)) return n as string
    return h
  }
  if (domains.length === 0) return json({ error: 'No active trusted sources are configured.' }, 400)
  const focus = domains.filter((d) => FOCUS_DOMAINS.includes(d))
  const searchDomains = focus.length ? focus : domains

  // --- 5. Tavily: advanced depth + full page content, bias to the current year -
  const year = new Date().getFullYear()
  // NOTE: 'type' is deliberately NOT part of the query — adding it narrows Tavily
  // and returns fewer pages. Type stays a hint to the model, not a search filter.
  const queryText = [keywords, field, geography && `for ${geography}`, `${year} ${year + 1}`]
    .filter(Boolean)
    .join(' ')
    .trim()

  let tavily: { results?: TavilyResult[] } = {}
  try {
    const tRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: queryText,
        include_domains: searchDomains,
        search_depth: 'basic', // 'advanced' crawls too slowly and blows the 150s limit
        include_raw_content: true, // still returns full page text, which is what we need
        max_results: 8,
      }),
      signal: AbortSignal.timeout(30000), // never let the search hang the whole function
    })
    if (!tRes.ok) {
      const text = await tRes.text()
      return json({ error: `Search provider error (${tRes.status}).`, detail: text.slice(0, 300) }, 502)
    }
    tavily = await tRes.json()
  } catch (e) {
    return json({ error: 'Could not reach the search provider.', detail: String(e) }, 502)
  }

  const results = (tavily.results ?? []).filter((r) => r?.url && hostTrusted(r.url, domains))
  const resultUrls = new Set(results.map((r) => r.url))
  // Every URL that genuinely appears on the fetched pages (for apply-link checks).
  const pageUrls = new Set<string>()
  for (const r of results) {
    pageUrls.add(r.url)
    for (const u of urlsInText(r.raw_content ?? r.content ?? '')) pageUrls.add(u)
  }
  // Normalised (trailing-slash/case-insensitive) sets, so a verbatim-but-slightly-
  // different URL from the model still matches a real one.
  const norm = (u: string) => (u || '').trim().replace(/\/+$/, '').toLowerCase()
  const resultUrlsN = new Set([...resultUrls].map(norm))
  const pageUrlsN = new Set([...pageUrls].map(norm))
  const resultByUrlN = new Map(results.map((r) => [norm(r.url), r]))

  if (results.length === 0) {
    await admin.from('search_cache').upsert(
      { query_key: queryKey, results: [], expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString() },
      { onConflict: 'query_key' },
    )
    return json({ candidates: [], cached: false, formatter: 'none' })
  }

  // --- 6. LLM: structure the full page content into candidates ----------------
  const systemPrompt =
    'You extract real education and career opportunities from the page content of trusted opportunity portals.\n' +
    'Rules you MUST follow:\n' +
    '1. Use ONLY opportunities that actually appear in the provided pages. Never invent anything. A single page may LIST SEVERAL opportunities — extract each distinct one you can see, with its own title and link.\n' +
    '2. "summary": 2–4 sentences on WHAT the opportunity is and what it offers (benefits, funding, what the participant gets). Not about who can apply.\n' +
    '3. "eligibility": WHO can apply — nationality, study level, field, requirements — as stated, or null if the page does not say. Keep it separate from the summary.\n' +
    '4. "type": exactly one of scholarship, course, internship, job, fellowship.\n' +
    '5. "deadline": the real application deadline as YYYY-MM-DD if the page states one; otherwise null. Do NOT drop an opportunity just because the deadline is missing or unclear.\n' +
    '6. "source_link": the portal page URL (a result "url"). "application_link": the apply / "click here to apply" / "visit" URL found in the page body if present; otherwise set it equal to source_link.\n' +
    '7. Every URL you output MUST be copied verbatim from the page content or a result url. Never invent or modify a URL.\n' +
    '8. Only SKIP an opportunity if the page clearly shows its deadline has already passed. If the deadline is missing or unclear, INCLUDE it.\n' +
    '9. Prefer returning several candidates. Return an empty array ONLY if the pages genuinely contain no opportunities at all.'

  const prompt =
    systemPrompt +
    '\n\nSearch parameters: ' +
    JSON.stringify({ type, field, geography, keywords }) +
    `\n\nToday is ${nowIso.slice(0, 10)}.` +
    '\n\nPages (JSON):\n' +
    JSON.stringify(
      results.map((r) => ({ title: r.title, url: r.url, content: (r.raw_content ?? r.content ?? '').slice(0, 7000) })),
    ) +
    '\n\nRespond with ONLY a JSON object of this exact shape and nothing else — no markdown, no commentary:\n' +
    '{"opportunities":[{"title":"string","provider":"string","type":"scholarship|course|internship|job|fellowship","summary":"string","eligibility":"string or null","deadline":"YYYY-MM-DD or null","application_link":"string","source_link":"string"}]}'

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  }

  const ranked = rankModels(await listGenModels(GEMINI_KEY)).slice(0, 3)
  let rawList: Array<Record<string, unknown>> = []
  let usedFormatter = 'basic'
  let formatterDetail = ranked.length ? '' : 'No generateContent models available for this API key.'

  for (const m of ranked) {
    let text: string | null = null
    let note = ''
    for (let attempt = 0; attempt < 2 && text === null; attempt++) {
      try {
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
          },
        )
        if (gRes.ok) {
          const body = await gRes.json()
          text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        } else {
          note = String(gRes.status)
          if (gRes.status === 503 || gRes.status === 429) {
            await sleep(600 * (attempt + 1)) // overloaded / rate-limited — back off and retry
          } else {
            break
          }
        }
      } catch {
        note = 'fetch-error'
        break
      }
    }
    if (text !== null) {
      try {
        const parsed = extractJson(text)
        if (Array.isArray(parsed.opportunities)) {
          rawList = parsed.opportunities
          usedFormatter = m
          break
        }
        note = 'unparseable'
      } catch {
        note = 'unparseable'
      }
    }
    formatterDetail += `${m}:${note || 'no-result'} `
  }

  // Fallback: build candidates straight from the page content, no LLM.
  if (usedFormatter === 'basic') {
    rawList = results.map((r) => {
      const content = (r.raw_content ?? r.content ?? '').replace(/\s+/g, ' ').trim()
      return {
        title: (r.title ?? '').split(' | ')[0].split(' - ')[0].trim(),
        provider: providerForUrl(r.url),
        type: inferType(type, `${r.title} ${content}`),
        summary: content.slice(0, 320) || null,
        eligibility: null,
        deadline: findDeadline(content),
        application_link: findApplyLink(content, r.url) ?? r.url,
        source_link: r.url,
      }
    })
  }

  // --- 7. Validate, split links, drop expired ---------------------------------
  const candidates = rawList
    .map((c) => {
      const source = String(c.source_link ?? '')
      const apply = String(c.application_link ?? '')
      const t = OPP_TYPES.includes(String(c.type)) ? String(c.type) : null
      // source must be a trusted portal URL that really appears in the results/pages;
      // apply may be any URL that really appears on a page (external apply link OK).
      const validSource =
        source && hostTrusted(source, domains) && (resultUrlsN.has(norm(source)) || pageUrlsN.has(norm(source)))
          ? source
          : null
      let validApply = apply && (pageUrlsN.has(norm(apply)) || resultUrlsN.has(norm(apply))) ? apply : null
      const finalSource = validSource ?? (validApply && hostTrusted(validApply, domains) ? validApply : null)
      // If the model gave no distinct apply link (or just echoed the portal page),
      // pull the real "apply/visit" link out of that page's full content.
      if ((!validApply || (finalSource && norm(validApply) === norm(finalSource))) && finalSource) {
        const r = resultByUrlN.get(norm(finalSource))
        const found = r ? findApplyLink(r.raw_content ?? r.content ?? '', finalSource) : null
        if (found) validApply = found
      }
      return {
        title: String(c.title ?? '').trim(),
        provider: String(c.provider ?? '').trim() || providerForUrl(finalSource ?? apply),
        type: t,
        summary: c.summary ? String(c.summary).trim() : null,
        eligibility: c.eligibility ? String(c.eligibility).trim() : null,
        deadline: normalizeDeadline(c.deadline),
        application_link: validApply ?? finalSource,
        source_link: finalSource ?? validApply,
      }
    })
    .filter((c) => c.title && c.type && (c.application_link || c.source_link))
    .filter((c) => !isExpired(c.deadline)) // only opportunities still open
    .map((c) => ({
      ...c,
      application_link: c.application_link ?? c.source_link,
      source_link: c.source_link ?? c.application_link,
    }))

  // --- 8. Cache + return ------------------------------------------------------
  // Stage counts so we can see where candidates drop (search → model → validation).
  formatterDetail = `${formatterDetail} [tavily=${results.length} model=${rawList.length} valid=${candidates.length}]`.trim()

  await admin.from('search_cache').upsert(
    { query_key: queryKey, results: candidates, expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString() },
    { onConflict: 'query_key' },
  )

  return json({ candidates, cached: false, formatter: usedFormatter, formatterDetail: formatterDetail.trim() })
  } catch (e) {
    // Any unexpected crash becomes a readable (CORS-enabled) message instead of a
    // bare non-2xx the browser can't read.
    return json({ error: 'Discovery failed unexpectedly.', detail: String((e as Error)?.stack ?? e).slice(0, 600) }, 500)
  }
})
