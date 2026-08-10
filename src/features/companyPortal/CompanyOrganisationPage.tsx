import { useAuth } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import CompanyApplicationPage from './CompanyApplicationPage'

export default function CompanyOrganisationPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
      return
    }
    navigate({ to: '/' })
  }

  const handleClose = () => {
    navigate({ to: '/', replace: true })
  }

  if (!isLoaded) {
    return (
      <section className="h-full w-full overflow-y-auto px-5 py-6">
        <p className="text-sm text-[#6f6a93]">Laddar företagssidan...</p>
      </section>
    )
  }

  if (!isSignedIn) {
    return (
      <section className="h-full w-full overflow-y-auto px-5 py-6">
        <p className="text-sm text-[#6f6a93]">
          Du måste vara inloggad för att ansöka om en organisation.
        </p>
      </section>
    )
  }

  return <CompanyApplicationPage onBack={handleBack} onClose={handleClose} />
}
