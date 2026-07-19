import { memoryTableConfig, rowToMemory } from '../memories'

describe('memoryTableConfig', () => {
  it('cycle', () => {
    expect(memoryTableConfig('cycle')).toEqual({
      table: 'cycle_logs',
      dateCol: 'date',
      typeCol: 'type',
      typeValue: 'memory',
      scope: 'user',
    })
  })

  it('pregnancy', () => {
    expect(memoryTableConfig('pregnancy')).toEqual({
      table: 'pregnancy_logs',
      dateCol: 'log_date',
      typeCol: 'log_type',
      typeValue: 'memory',
      scope: 'user',
    })
  })

  it('kids', () => {
    expect(memoryTableConfig('kids')).toEqual({
      table: 'child_logs',
      dateCol: 'date',
      typeCol: 'type',
      typeValue: 'photo',
      scope: 'child',
    })
  })
})

describe('rowToMemory', () => {
  it('cycle: reads date/notes as-is', () => {
    expect(
      rowToMemory('cycle', { id: 'x', date: '2026-07-01', photos: ['a.jpg'], notes: 'first' })
    ).toEqual({ id: 'x', date: '2026-07-01', photos: ['a.jpg'], caption: 'first' })
  })

  it('pregnancy: reads log_date, null notes -> empty caption, empty photos', () => {
    expect(
      rowToMemory('pregnancy', { id: 'y', log_date: '2026-06-01', photos: [], notes: null })
    ).toEqual({ id: 'y', date: '2026-06-01', photos: [], caption: '' })
  })

  it('kids: reads date/notes as-is', () => {
    expect(
      rowToMemory('kids', { id: 'z', date: '2026-05-01', photos: ['p.jpg'], notes: 'baby' })
    ).toEqual({ id: 'z', date: '2026-05-01', photos: ['p.jpg'], caption: 'baby' })
  })

  it('missing photos falls back to empty array', () => {
    expect(
      rowToMemory('cycle', { id: 'w', date: '2026-07-02', notes: 'no photos field' })
    ).toEqual({ id: 'w', date: '2026-07-02', photos: [], caption: 'no photos field' })
  })
})
