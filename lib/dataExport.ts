import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { supabase } from './supabase'

interface ExportDeps {
  invoke: (name: string) => Promise<{ data: unknown; error: unknown }>
  writeFile: (uri: string, contents: string) => Promise<void>
  deleteFile: (uri: string) => Promise<void>
  canShare: () => Promise<boolean>
  share: (uri: string, title: string) => Promise<void>
  dir: string
  title: string
}

/**
 * Fetch the full data export (export-user-data), hand it to the share sheet as a .json file, then
 * delete the file. Resolves 'shared', or 'unavailable' when the device can't share. Throws on any
 * failure — the caller shows the localized error. The file holds every log and child record, so it
 * never stays in the app cache (it used to outlive sign-out and account deletion).
 */
export async function exportMyData(deps: ExportDeps): Promise<'shared' | 'unavailable'> {
  const { data, error } = await deps.invoke('export-user-data')
  if (error) throw error
  if (!data || typeof data !== 'object' || 'error' in (data as Record<string, unknown>)) {
    throw new Error('Export failed')
  }
  if (!(await deps.canShare())) return 'unavailable'
  const uri = `${deps.dir}grandma-data-export-${new Date().toISOString().slice(0, 10)}.json`
  try {
    await deps.writeFile(uri, JSON.stringify(data, null, 2))
    await deps.share(uri, deps.title)
    return 'shared'
  } finally {
    await deps.deleteFile(uri).catch(() => {})
  }
}

/** exportMyData wired to Supabase, expo-file-system and expo-sharing. */
export function exportMyDataOnDevice(title: string): Promise<'shared' | 'unavailable'> {
  return exportMyData({
    invoke: (name) => supabase.functions.invoke(name),
    writeFile: (uri, contents) => FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 }),
    deleteFile: (uri) => FileSystem.deleteAsync(uri, { idempotent: true }),
    canShare: () => Sharing.isAvailableAsync(),
    share: (uri, dialogTitle) => Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle, UTI: 'public.json' }),
    dir: FileSystem.cacheDirectory ?? '',
    title,
  })
}
