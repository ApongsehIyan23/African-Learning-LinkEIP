import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

// Subscribe to Postgres changes on one or more tables and run `onChange` when any
// of them change. RLS still governs what each client receives, so a student's
// stream carries only published opportunities — the same rule as normal reads.
//
// `onChange` is held in a ref so passing a fresh function each render does not
// resubscribe; the channel is torn down on unmount.
export function useRealtime(tables, onChange) {
  const cb = useRef(onChange)
  cb.current = onChange
  const key = Array.isArray(tables) ? tables.join(',') : String(tables)

  useEffect(() => {
    if (!supabase) return
    const list = Array.isArray(tables) ? tables : [tables]
    const channel = supabase.channel(`rt-${key}-${Math.random().toString(36).slice(2)}`)
    for (const table of list) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => cb.current?.(payload))
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
