// STUB — Track D replaces with the real soft-vector storybook creature.
import type { CreatureSVGProps } from '@/contracts'

export function CreatureSVG({ params, mood, size, className, title }: CreatureSVGProps) {
  return (
    <svg
      data-stub="CreatureSVG"
      data-mood={mood}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <ellipse cx="50" cy="58" rx="34" ry="30" fill={params.palette[0]} />
      <circle cx="40" cy="50" r="6" fill="#fff" />
      <circle cx="60" cy="50" r="6" fill="#fff" />
      <circle cx="40" cy="51" r="3" fill="#222" />
      <circle cx="60" cy="51" r="3" fill="#222" />
    </svg>
  )
}
