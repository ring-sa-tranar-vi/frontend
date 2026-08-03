import { Headphones, MessageSquareText } from 'lucide-react'
import type { CoachCallSession } from '../types'
import { useTranslation } from 'react-i18next'

type ExercisePanelProps = {
  session: CoachCallSession
}

function InstructionCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl bg-[#f4efff] px-4 py-4">
      <div className="mb-2 flex items-center gap-2 text-[#5b3fd6]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
          {icon}
        </div>

        <p className="text-sm font-extrabold tracking-wide uppercase">
          {label}
        </p>
      </div>

      {children}
    </div>
  )
}

export function ExercisePanel({ session }: ExercisePanelProps) {
  const { t } = useTranslation()
  const instructions =
    session.instructions?.trim() || t('exercisePanel.noInstructions')

  return (
    <div className="space-y-4">
      <InstructionCard
        label={t('exercisePanel.workoutTitle')}
        icon={<MessageSquareText size={20} strokeWidth={2.4} />}
      >
        <p className="text-lg leading-snug font-extrabold text-[#100b2f]">
          {session.workoutName ||
            session.name ||
            t('exercisePanel.unnamedWorkout')}
        </p>

        {session.type ? (
          <p className="mt-1 text-sm font-bold text-[#6f6a93]">
            {t('exercisePanel.type')}: {session.type}
          </p>
        ) : null}
      </InstructionCard>

      <InstructionCard
        label={t('exercisePanel.instructions')}
        icon={<Headphones size={20} strokeWidth={2.4} />}
      >
        <p className="text-[15px] leading-relaxed font-semibold whitespace-pre-line text-[#33295e]">
          {instructions}
        </p>
      </InstructionCard>
    </div>
  )
}
