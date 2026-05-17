'use client'

import { useRef } from 'react'
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionProps,
} from 'framer-motion'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  distance?: number
  once?: boolean
  stagger?: number
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  distance = 40,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: '-60px' })

  const directionMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  }

  const initial = directionMap[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...initial }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...initial }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  once = true,
}: {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  once?: boolean
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  direction = 'up',
  distance = 30,
}: {
  children: React.ReactNode
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
}) {
  const directionMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...directionMap[direction] },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.2,
}: {
  children: React.ReactNode
  className?: string
  speed?: number
}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, speed * -100])

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  )
}

export function ScaleOnScroll({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.92])
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6])

  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity }}>
      {children}
    </motion.div>
  )
}
