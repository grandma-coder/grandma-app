/**
 * Grandma Talk Route — modal chat screen. Behind the remote `grandma_chat` flag (command center):
 * when it's off, a deep link or stale entry point lands back where it came from.
 */

import { Redirect } from 'expo-router'
import { GrandmaTalk } from '../components/chat/GrandmaTalk'
import { useGrandmaChatEnabled } from '../store/useFeatureFlags'

export default function GrandmaTalkRoute() {
  const enabled = useGrandmaChatEnabled()
  if (!enabled) return <Redirect href="/(tabs)" />
  return <GrandmaTalk />
}
