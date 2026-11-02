import { useAgendaViewStore } from '../useAgendaViewStore'

type Persist = { getOptions: () => { name?: string; partialize?: (s: unknown) => unknown } }
const opts = () => (useAgendaViewStore as unknown as { persist: Persist }).persist.getOptions()

describe('useAgendaViewStore', () => {
  it('starts on the Week view', () => {
    expect(useAgendaViewStore.getState().view).toBe('week')
  })

  it('switches view and persists only the choice', () => {
    useAgendaViewStore.getState().setView('month')
    expect(useAgendaViewStore.getState().view).toBe('month')
    expect(opts().name).toBe('grandma-agenda-view')
    expect(opts().partialize!(useAgendaViewStore.getState())).toEqual({ view: 'month' })
    useAgendaViewStore.getState().setView('week')
  })
})
