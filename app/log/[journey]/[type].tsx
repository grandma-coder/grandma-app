/**
 * grandma-app://log/<journey>/<type>?child=<id> — from home-screen widgets and app-icon
 * shortcuts. Switches journey/child, leaves the log type for that home, and goes home.
 */
import { useEffect } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { parseWidgetLink } from '../../../lib/widgets/deepLinks'
import { applyWidgetLink } from '../../../lib/widgets/applyLink'

export default function WidgetLinkRoute() {
  const { journey, type, child } = useLocalSearchParams<{ journey: string; type: string; child?: string }>()
  useEffect(() => {
    const p = parseWidgetLink(String(journey), String(type), child ? String(child) : undefined)
    // Go back to the existing tabs (a replace would mount a second home and the sheet would open
    // on the one being thrown away), then apply — so the home that ends up on screen opens it.
    router.navigate('/(tabs)')
    if (p) setTimeout(() => applyWidgetLink(p), 0)
  }, [journey, type, child])
  return null
}
