import type { ReactNode } from 'react'
import {
  AppSheetSectionText,
  AppSheetSectionTitle,
} from '../../../../components/AppSheet'

export default function MenuSectionHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description?: string
}) {
  return (
    <header>
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary)"
          aria-hidden="true"
        >
          {icon}
        </div>
        <AppSheetSectionTitle>{title}</AppSheetSectionTitle>
      </div>
      {description ? (
        <AppSheetSectionText>{description}</AppSheetSectionText>
      ) : null}
    </header>
  )
}
