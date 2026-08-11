import { createFileRoute } from '@tanstack/react-router'
import CompanyOrganisationPage from '../features/companyPortal/CompanyOrganisationPage'

export const Route = createFileRoute('/company/organisations')({
  component: CompanyOrganisationPage,
})
