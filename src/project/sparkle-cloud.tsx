/**
 * The "fixing" moment: a soft cloud bobs over the component, sparkles twinkle and glitter drizzles down;
 * when the fix lands the cloud goes poof, the sparkles burst outward, and the fixed component shows underneath.
 * Reduced motion: a plain veil that fades.
 */
import { motion, useReducedMotion } from "motion/react"

const SPARKLES = [
  { x: -0.46, y: -0.32, s: 1, d: 0 },
  { x: 0.5, y: -0.38, s: 0.8, d: 0.35 },
  { x: -0.58, y: 0.18, s: 0.65, d: 0.7 },
  { x: 0.6, y: 0.12, s: 1.1, d: 0.2 },
  { x: -0.18, y: -0.62, s: 0.7, d: 0.9 },
  { x: 0.22, y: -0.66, s: 0.9, d: 0.55 },
  { x: 0.02, y: 0.44, s: 0.6, d: 1.1 },
  { x: -0.34, y: 0.5, s: 0.8, d: 0.45 },
  { x: 0.4, y: 0.52, s: 0.7, d: 0.8 },
  { x: 0.74, y: -0.12, s: 0.55, d: 1.25 },
  { x: -0.76, y: -0.08, s: 0.6, d: 0.15 },
]
const COLORS = ["#f0abfc", "#fde68a", "#93c5fd", "#c4b5fd", "#f9a8d4", "#a5f3fc"]
const STAR = "M0,-10 C1.2,-1.2 1.2,-1.2 10,0 C1.2,1.2 1.2,1.2 0,10 C-1.2,1.2 -1.2,1.2 -10,0 C-1.2,-1.2 -1.2,-1.2 0,-10Z"
const GLITTER = Array.from({ length: 14 }, (_, i) => ({ x: ((i * 37) % 100) / 100 - 0.5, d: (i * 0.23) % 1.6, c: COLORS[i % COLORS.length] }))

export function SparkleCloud({ width, label }: { width: number; label: string }) {
  const reduce = useReducedMotion()
  const size = Math.max(200, Math.min(width * 0.62, 440))
  if (reduce)
    return (
      <motion.div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl bg-white/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <span className="text-2xl font-medium text-fuchsia-700">{label}</span>
      </motion.div>
    )
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.25 } }}
      aria-hidden
    >
      {/* dreamy veil over the old component */}
      <motion.div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ background: "radial-gradient(120% 80% at 50% 22%, rgb(255 255 255 / 0.72), rgb(250 245 255 / 0.5) 55%, rgb(236 254 255 / 0.35))" }}
        exit={{ opacity: 0, transition: { duration: 0.6, delay: 0.2 } }}
      />
      <div className="absolute left-1/2" style={{ top: `min(16%, 150px)`, width: size, height: size * 0.62, marginLeft: -size / 2 }}>
        {/* glitter drizzling from the cloud */}
        {GLITTER.map((g, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${50 + g.x * 70}%`, top: "62%", width: size * 0.02, height: size * 0.02, background: g.c, boxShadow: `0 0 ${size * 0.02}px ${g.c}` }}
            animate={{ y: [0, size * 0.9], opacity: [0, 1, 0], scale: [0.6, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: g.d, ease: "easeIn" }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          />
        ))}
        {/* the cloud */}
        <motion.svg
          viewBox="0 0 200 124"
          className="absolute inset-0 size-full overflow-visible"
          initial={{ scale: 0.4, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: [0, -8, 0], opacity: 1 }}
          transition={{ scale: { type: "spring", stiffness: 260, damping: 16 }, opacity: { duration: 0.2 }, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
          exit={{ scale: 1.35, opacity: 0, filter: "blur(8px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
        >
          <defs>
            <linearGradient id="cloud-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#f3e8ff" />
            </linearGradient>
            <linearGradient id="cloud-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0abfc" />
              <stop offset="0.5" stopColor="#c4b5fd" />
              <stop offset="1" stopColor="#93c5fd" />
            </linearGradient>
            <filter id="cloud-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#cloud-glow)">
            <path
              d="M48 104 C22 104 10 88 14 72 C18 56 34 50 46 54 C48 32 66 18 88 22 C102 6 132 8 142 30 C162 26 182 40 180 60 C196 64 198 92 178 102 C172 105 166 104 160 104 Z"
              fill="url(#cloud-fill)"
              stroke="url(#cloud-rim)"
              strokeWidth="3"
            />
          </g>
          {/* sleepy, happy face */}
          <path d="M80 70 q6 6 12 0" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
          <path d="M108 70 q6 6 12 0" fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
          <path d="M94 82 q6 6 12 0" fill="none" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="72" cy="80" r="5" fill="#fbcfe8" opacity="0.9" />
          <circle cx="128" cy="80" r="5" fill="#fbcfe8" opacity="0.9" />
        </motion.svg>
        {/* sparkles: twinkle around the cloud, burst outward on poof */}
        {SPARKLES.map((p, i) => (
          <motion.svg
            key={i}
            viewBox="-12 -12 24 24"
            className="absolute"
            style={{ left: `calc(50% + ${p.x * size}px)`, top: `calc(50% + ${p.y * size}px)`, width: size * 0.16 * p.s, height: size * 0.16 * p.s, marginLeft: -size * 0.08 * p.s, marginTop: -size * 0.08 * p.s }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: [0, 1, 0.3, 1, 0], rotate: [0, 45, 90] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: p.d, ease: "easeInOut" }}
            exit={{ x: p.x * size * 0.9, y: p.y * size * 0.9, scale: [1, 1.6, 0], opacity: [1, 1, 0], transition: { duration: 0.6, ease: "easeOut" } }}
          >
            <path d={STAR} fill={COLORS[i % COLORS.length]} />
          </motion.svg>
        ))}
      </div>
      <motion.div
        className="absolute inset-x-0 text-center font-medium tracking-tight text-fuchsia-800"
        style={{ top: `calc(min(16%, 150px) + ${size * 0.62 + size * 0.12}px)`, fontSize: Math.max(18, size * 0.075) }}
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
      >
        {label}
      </motion.div>
    </motion.div>
  )
}
