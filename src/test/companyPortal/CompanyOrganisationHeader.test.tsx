import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import CompanyOrganisationHeader from '../../features/companyPortal/components/CompanyOrganisationHeader.tsx'

describe('CompanyOrganisationHeader', () => {
  const defaultProps = {
    statusMessage: null,
    onBack: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders title and description', () => {
    render(<CompanyOrganisationHeader {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: 'Din organisation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Hantera din organisationsprofil och event'),
    ).toBeInTheDocument()
  })

  it('triggers onBack callback when clicking the back button', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()

    render(<CompanyOrganisationHeader {...defaultProps} onBack={onBack} />)

    await user.click(screen.getByRole('button', { name: 'Tillbaka' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('triggers onClose callback when clicking the close button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(<CompanyOrganisationHeader {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Stäng' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders status message when provided', () => {
    render(
      <CompanyOrganisationHeader
        {...defaultProps}
        statusMessage="Ansökan är under granskning"
      />,
    )

    expect(screen.getByText('Ansökan är under granskning')).toBeInTheDocument()
  })

  it('does not render status message box when statusMessage is null', () => {
    render(<CompanyOrganisationHeader {...defaultProps} statusMessage={null} />)

    expect(
      screen.queryByText('Ansökan är under granskning'),
    ).not.toBeInTheDocument()
  })
})
