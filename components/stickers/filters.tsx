/** Mount once in the layout: the `wob` (hand-drawn wobble) and `cut` (die-cut white edge) filters used by <Sticker>. */
export function StickerFilters() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="wob" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        <filter id="cut" x="-25%" y="-25%" width="150%" height="150%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="d" />
          <feFlood floodColor="#fff" />
          <feComposite in2="d" operator="in" result="w" />
          <feGaussianBlur in="d" stdDeviation="2.4" result="b" />
          <feOffset in="b" dy="2.6" result="o" />
          <feFlood floodColor="#3a2c10" floodOpacity=".28" />
          <feComposite in2="o" operator="in" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="w" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
