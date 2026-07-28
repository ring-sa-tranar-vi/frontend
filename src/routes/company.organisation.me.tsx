import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/company/organisation/me')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/company/organisation/me"!</div>
}
