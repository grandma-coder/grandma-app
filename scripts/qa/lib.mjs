// Shared bits for the QA scripts. Uses the locally installed Chrome (no browser download).
import { chromium, devices } from 'playwright-core'

export const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const LOCALES = ['pt', 'en']
export { devices }

export const launch = () => chromium.launch({ executablePath: CHROME_PATH })

/** Vercel Analytics 404s off Vercel; that is the only noise we accept. */
const noise = (url = '', text = '') => url.includes('/_vercel/insights') || text.includes('Vercel Web Analytics')

/** Collect page errors and console errors on a page. `list` receives readable strings. */
export function watchErrors(page, list) {
  page.on('pageerror', (e) => list.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const { url } = m.location()
    if (!noise(url, m.text())) list.push(`console.error: ${m.text()} (${url})`)
  })
}

/** Set html/body overflow-x to visible so overflow hidden by `overflow-x: hidden` is measured too. */
export const unhideOverflow = (page) => page.addStyleTag({ content: 'html,body{overflow-x:visible !important}' })
