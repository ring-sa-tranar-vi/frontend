import { useNavigate } from '@tanstack/react-router'
import CompanyOrganisationLayout from './components/CompanyOrganisationLayout'
import { useCompanyOrganisationPage } from './useCompanyOrganisationPage'

export default function CompanyOrganisationPage() {
  const vm = useCompanyOrganisationPage()
  const navigate = useNavigate()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
      return
    }
    navigate({ to: '/' })
  }

  const handleClose = () => {
    navigate({ to: '/' })
  }

  if (vm.isLoading) {
    return (
      <section className="h-full w-full overflow-y-auto px-5 py-6">
        <p className="text-sm text-[#6f6a93]">Laddar företagssidan...</p>
      </section>
    )
  }

  if (vm.isError) {
    return (
      <section className="h-full w-full overflow-y-auto px-5 py-6">
        <p className="text-sm text-red-700">{vm.errorMessage}</p>
      </section>
    )
  }

  return (
    <CompanyOrganisationLayout
      vm={vm}
      onBack={handleBack}
      onClose={handleClose}
    />
  )
}
