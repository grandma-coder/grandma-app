import { supabase } from './supabase'

export interface LocationEntry {
  id: string
  childId: string
  latitude: number
  longitude: number
  accuracyMeters?: number
  source: string
  createdAt: string
}

/**
 * Get the latest location for a child.
 * In a full implementation, this would interface with Apple FindMy / CoreBluetooth.
 * For now, it reads from the location_logs table.
 */
export async function getLastLocation(childId: string): Promise<LocationEntry | null> {
  const { data, error } = await supabase
    .from('location_logs')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null

  return {
    id: data.id,
    childId: data.child_id,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracyMeters: data.accuracy_meters,
    source: data.source,
    createdAt: data.created_at,
  }
}

/**
 * Save a location update for a child.
 */
export async function saveLocation(input: {
  childId: string
  latitude: number
  longitude: number
  accuracyMeters?: number
  source?: string
}) {
  const { data, error } = await supabase
    .from('location_logs')
    .insert({
      child_id: input.childId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy_meters: input.accuracyMeters ?? null,
      source: input.source ?? 'airtag',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Check if AirTag tracking is set up for a child.
 * Placeholder — real implementation needs native module.
 */
export async function isAirTagConnected(_childId: string): Promise<boolean> {
  // TODO: Implement via native CoreBluetooth / FindMy integration
  return false
}
