export function Mark({ size = 40, still = false, className = '' }: { size?: number; still?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
      <g stroke="#1A1916" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M100 35 L100 60" /><path d="M70 42 L78 65" /><path d="M130 42 L122 65" /><path d="M48 58 L62 74" /><path d="M152 58 L138 74" />
        <path d="M100 160 L100 140" /><path d="M70 158 L78 138" /><path d="M130 158 L122 138" /><path d="M48 142 L62 128" /><path d="M152 142 L138 128" />
      </g>
      <g className={still ? undefined : 'mark-eye'}>
        <path d="M 35 100 Q 100 55 165 100 Q 100 145 35 100 Z" fill="#F5D652" stroke="#1A1916" strokeWidth="4.5" strokeLinejoin="round" />
        <g className={still ? undefined : 'mark-heart'}>
          <path d="M100 128 C 72 106 64 86 82 76 C 92 71 100 80 100 88 C 100 80 108 71 118 76 C 136 86 128 106 100 128 Z" fill="#1A1916" />
          <path d="M100 122 C 78 104 72 88 86 80 C 94 77 100 83 100 90 C 100 83 106 77 114 80 C 128 88 122 104 100 122 Z" fill="#EE7B6D" />
        </g>
      </g>
    </svg>
  )
}
