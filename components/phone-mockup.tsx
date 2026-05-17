'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface PhoneMockupProps {
  children: React.ReactNode
  className?: string
  variant?: 'light' | 'dark'
}

export function PhoneMockup({ children, className = '', variant = 'light' }: PhoneMockupProps) {
  const bgColor = variant === 'light' ? '#F3ECD9' : '#141313'

  return (
    <div className={`relative mx-auto ${className}`} style={{ width: 280, maxWidth: '100%' }}>
      {/* Phone frame */}
      <div
        className="relative rounded-[36px] overflow-hidden border-[3px]"
        style={{
          borderColor: 'var(--ink)',
          background: bgColor,
          aspectRatio: '9/19.5',
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
          style={{
            width: 100,
            height: 28,
            background: 'var(--ink)',
            borderRadius: '0 0 18px 18px',
          }}
        />

        {/* Screen content */}
        <div className="relative w-full h-full overflow-hidden pt-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function AnimatedPhoneMockup({
  children,
  isVisible,
  className = '',
}: {
  children: React.ReactNode
  isVisible: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className={className}
        >
          <PhoneMockup>{children}</PhoneMockup>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
