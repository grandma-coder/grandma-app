import { resolveTranslatedContent } from '../translatedContentResolve'

describe('resolveTranslatedContent', () => {
  it('en → source text immediately, never loading (no fetch)', () => {
    expect(resolveTranslatedContent('en', 'Hello there', undefined, false, false))
      .toEqual({ text: 'Hello there', loading: false })
  })

  it('non-en while loading with no fetched result → falls back to source, loading true', () => {
    expect(resolveTranslatedContent('pt-BR', 'Rest when you can', undefined, true, true))
      .toEqual({ text: 'Rest when you can', loading: true })
  })

  it('non-en with a fetched translation → shows the translation, not loading', () => {
    expect(resolveTranslatedContent('pt-BR', 'Rest when you can', 'Descanse quando puder', true, false))
      .toEqual({ text: 'Descanse quando puder', loading: false })
  })

  it('non-en with empty source → not enabled, shows source, not loading', () => {
    expect(resolveTranslatedContent('es', '', undefined, false, false))
      .toEqual({ text: '', loading: false })
  })
})
