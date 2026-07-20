import { buildPermissionsObject } from '../caregiverPermissions'

describe('buildPermissionsObject', () => {
  it('granular path writes capabilities + _shared_cards and preserves meta', () => {
    const out = buildPermissionsObject({
      existing: { view: true, log_activity: true, chat: true, _paused: true, _photo_url: 'p/old.jpg' },
      displayName: 'Nana',
      granular: {
        view: true, log_activity: true, chat: false, edit_child: true, emergency: false,
        _shared_cards: { kids: ['hero-tiles', 'diaper'] },
      },
    })
    expect(out.edit_child).toBe(true)
    expect(out.chat).toBe(false)
    expect(out._shared_cards?.kids).toEqual(['hero-tiles', 'diaper'])
    expect(out._display_name).toBe('Nana')
    expect(out._photo_url).toBe('p/old.jpg')
    expect(out._paused).toBe(true)
  })

  it('preset path expands perms and writes no _shared_cards', () => {
    const out = buildPermissionsObject({
      existing: { view: true, log_activity: false, chat: false },
      displayName: 'Sitter',
      presetPerms: ['view', 'log_activity', 'chat'],
    })
    expect(out.view).toBe(true)
    expect(out.log_activity).toBe(true)
    expect(out.chat).toBe(true)
    expect(out.edit_child).toBeUndefined()
    expect(out._shared_cards).toBeUndefined()
    expect(out._display_name).toBe('Sitter')
  })

  it('new photo path overrides stored _photo_url', () => {
    const out = buildPermissionsObject({
      existing: { view: true, log_activity: false, chat: false, _photo_url: 'p/old.jpg' },
      displayName: 'X',
      photoUrl: 'p/new.jpg',
      presetPerms: ['view'],
    })
    expect(out._photo_url).toBe('p/new.jpg')
  })
})
