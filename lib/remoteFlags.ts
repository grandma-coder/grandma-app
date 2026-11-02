import { supabase } from './supabase'
import { useFeatureFlags } from '../store/useFeatureFlags'

/**
 * Reads public.feature_flags (toggled from the grandma command center) into the flags store.
 * Fails closed: a missing row, a read error or no network leaves every remote flag OFF.
 */
export async function loadRemoteFlags(): Promise<void> {
  try {
    const { data, error } = await supabase.from('feature_flags').select('key, enabled')
    if (error || !data) return
    const on = (key: string) => data.some((r: { key: string; enabled: boolean }) => r.key === key && r.enabled === true)
    useFeatureFlags.getState().setRemoteFlags({ grandmaChat: on('grandma_chat'), dailyRewards: on('daily_rewards') })
  } catch {
    // keep defaults (off)
  }
}
