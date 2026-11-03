import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PATHS, type StickerName } from './paths'
import { Sticker } from './sticker'
import { StickerFilters } from './filters'

const names = Object.keys(PATHS) as StickerName[]

describe('sticker library', () => {
  it('ports every mockup sticker', () => {
    for (const n of ['cal', 'bars', 'me', 'baby2', 'owl', 'corn', 'rasp', 'plum', 'avocado', 'banana', 'eggplant', 'jicama', 'lettuce', 'pumpkin', 'crib', 'bodysuit', 'books', 'camera', 'globe', 'otest', 'leaf', 'egg', 'moon2', 'flower', 'baby', 'phone']) {
      expect(names).toContain(n)
    }
  })

  it.each(names)('%s renders a wobbled svg with markup', (name) => {
    const html = renderToStaticMarkup(<Sticker name={name} />)
    expect(html).toContain('<svg')
    expect(html).toContain('viewBox="-6 -6 76 76"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('filter="url(#wob)"')
    expect(html).not.toContain('filter="url(#cut)"')
    const inner = html.match(/<g filter="url\(#wob\)">([\s\S]*)<\/g><\/svg>/)?.[1] ?? ''
    expect(inner.length).toBeGreaterThan(20)
    expect(inner).not.toContain('${')
  })

  it('cut adds the die-cut filter', () => {
    expect(renderToStaticMarkup(<Sticker name="flower" cut />)).toContain('filter="url(#cut)"')
  })

  it('passes className and style', () => {
    const html = renderToStaticMarkup(<Sticker name="baby" className="x" style={{ width: 10 }} />)
    expect(html).toContain('class="x"')
    expect(html).toContain('width:10px')
  })

  it('filters define wob and cut', () => {
    const html = renderToStaticMarkup(<StickerFilters />)
    expect(html).toContain('id="wob"')
    expect(html).toContain('id="cut"')
  })
})
