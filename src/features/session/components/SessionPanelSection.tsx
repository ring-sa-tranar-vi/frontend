import type { ReactNode } from 'react'

type SessionPanelSectionProps = {
  title: string
  children: ReactNode
}

export function SessionPanelSection({
  title,
  children,
}: SessionPanelSectionProps) {
  return (
    <section>
      <h3 className="font-extrabold">{title}</h3>
      <div>{children}</div>
    </section>
  )
}
