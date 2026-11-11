// The full data export (every log, child, note — health data) was written to the app cache as
// grandma-data-export.json and never removed: it outlived the share sheet, sign-out and even
// account deletion, readable by whoever used the phone next.
jest.mock('../supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }))

import { exportMyData } from '../dataExport'

function deps(over: Partial<Parameters<typeof exportMyData>[0]> = {}) {
  return {
    invoke: jest.fn().mockResolvedValue({ data: { export_meta: {}, profile: {} }, error: null }),
    writeFile: jest.fn().mockResolvedValue(undefined),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    canShare: jest.fn().mockResolvedValue(true),
    share: jest.fn().mockResolvedValue(undefined),
    dir: 'file:///cache/',
    title: 'Export',
    ...over,
  }
}

describe('exportMyData', () => {
  it('shares the file and deletes it afterwards', async () => {
    const d = deps()
    await expect(exportMyData(d)).resolves.toBe('shared')
    expect(d.share).toHaveBeenCalledTimes(1)
    const uri = (d.writeFile as jest.Mock).mock.calls[0][0]
    expect(d.deleteFile).toHaveBeenCalledWith(uri)
  })

  it('deletes the file even when sharing fails', async () => {
    const d = deps({ share: jest.fn().mockRejectedValue(new Error('cancelled')) })
    await expect(exportMyData(d)).rejects.toThrow('cancelled')
    expect(d.deleteFile).toHaveBeenCalledTimes(1)
  })

  it('rejects an error payload instead of exporting it as the user data', async () => {
    const d = deps({ invoke: jest.fn().mockResolvedValue({ data: { error: 'Invalid token' }, error: null }) })
    await expect(exportMyData(d)).rejects.toThrow()
    expect(d.writeFile).not.toHaveBeenCalled()
  })
})
