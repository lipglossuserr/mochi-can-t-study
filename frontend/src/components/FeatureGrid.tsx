import FeatureCard from '@/components/FeatureCard'
import type { Feature } from '@/types/feature'

const features: Feature[] = [
  {
    icon: '🤖',
    title: 'AI Assistant',
    description:
      'Ask questions, get clear explanations, and untangle tricky topics in seconds.',
  },
  {
    icon: '⏱️',
    title: 'Focus Timer',
    description:
      'Study in small, sweet sessions sized like mochi bites — easy to start, easy to repeat.',
  },
  {
    icon: '📈',
    title: 'Progress Tracking',
    description:
      'Watch your study streaks and momentum build, one session at a time.',
  },
  {
    icon: '✅',
    title: 'Task Manager',
    description:
      'Keep assignments, deadlines, and to-dos organized in one calm place.',
  },
]

function FeatureGrid() {
  return (
    <section className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, index) => (
        <FeatureCard key={feature.title} index={index} {...feature} />
      ))}
    </section>
  )
}

export default FeatureGrid
