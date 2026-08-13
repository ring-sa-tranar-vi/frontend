import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import OrganisationInfoCard from '../../features/companyPortal/components/OrganisationInfoCard.tsx'

describe('OrganisationInfoCard', () => {
  const defaultProps = {
    isWideLayout: false,
    orgName: 'Acme Corp',
    setOrgName: vi.fn(),
    orgDescription: 'En fin organisation',
    setOrgDescription: vi.fn(),
    orgCity: 'Stockholm',
    setOrgCity: vi.fn(),
    orgWords: 3,
    orgCharacterCount: 19,
    canSaveOrg: true,
    saveOrganisation: vi.fn(),
    isSavingOrganisation: false,
  }

  const renderComponent = (propsOverrides = {}) => {
    const user = userEvent.setup()
    const props = { ...defaultProps, ...propsOverrides }
    const view = render(<OrganisationInfoCard {...props} />)

    return {
      user,
      props,
      ...view,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders heading and form fields with provided values', () => {
      renderComponent()

      expect(
        screen.getByRole('heading', {
          name: 'Organisationsinformation',
          level: 2,
        }),
      ).toBeInTheDocument()

      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Stockholm')).toBeInTheDocument()
      expect(
        screen.getByDisplayValue('En fin organisation'),
      ).toBeInTheDocument()
    })

    it('renders the image change button with correct aria-label', () => {
      renderComponent()

      expect(
        screen.getByRole('button', { name: 'Byt bild' }),
      ).toBeInTheDocument()
    })

    it('renders the helper text for organisation name', () => {
      renderComponent()

      expect(
        screen.getByText('Detta namn visas för andra i appen.'),
      ).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls setOrgName when typing in organisation name input', async () => {
      const setOrgName = vi.fn()
      const { user } = renderComponent({ setOrgName })

      const nameInput = screen.getByDisplayValue('Acme Corp')
      await user.type(nameInput, 's')

      expect(setOrgName).toHaveBeenCalledWith('Acme Corps')
    })

    it('calls setOrgCity when typing in city input', async () => {
      const setOrgCity = vi.fn()
      const { user } = renderComponent({ setOrgCity })

      const cityInput = screen.getByDisplayValue('Stockholm')
      await user.type(cityInput, 's')

      expect(setOrgCity).toHaveBeenCalledWith('Stockholms')
    })

    it('calls setOrgDescription when typing in description textarea', async () => {
      const setOrgDescription = vi.fn()
      const { user } = renderComponent({ setOrgDescription })

      const descriptionInput = screen.getByDisplayValue('En fin organisation')
      await user.type(descriptionInput, '!')

      expect(setOrgDescription).toHaveBeenCalledWith('En fin organisation!')
    })
  })

  describe('Word Count Styling', () => {
    it('renders word count without red text styling when orgWords is 100 or less', () => {
      renderComponent({ orgWords: 100 })

      const wordCountText = screen.getByText('100/100 ord')
      expect(wordCountText).toBeInTheDocument()
      expect(wordCountText).not.toHaveClass('text-red-700')
    })

    it('renders word count with red text styling when orgWords exceeds 100', () => {
      renderComponent({ orgWords: 101 })

      const wordCountText = screen.getByText('101/100 ord')
      expect(wordCountText).toBeInTheDocument()
      expect(wordCountText).toHaveClass('text-red-700')
    })
  })

  describe('Save Button Actions and Disabled States', () => {
    it('calls saveOrganisation when save button is clicked', async () => {
      const saveOrganisation = vi.fn()
      const { user } = renderComponent({ saveOrganisation })

      const saveButton = screen.getByRole('button', {
        name: 'Spara organisation',
      })
      await user.click(saveButton)

      expect(saveOrganisation).toHaveBeenCalledTimes(1)
    })

    it('disables save button when canSaveOrg is false', () => {
      renderComponent({ canSaveOrg: false })

      expect(
        screen.getByRole('button', { name: 'Spara organisation' }),
      ).toBeDisabled()
    })

    it('disables save button when isSavingOrganisation is true', () => {
      renderComponent({ isSavingOrganisation: true })

      expect(
        screen.getByRole('button', { name: 'Spara organisation' }),
      ).toBeDisabled()
    })
  })

  describe('Layout Variants', () => {
    it('applies col-span-5 class when isWideLayout is true', () => {
      const { container } = renderComponent({ isWideLayout: true })

      const article = container.querySelector('article')
      expect(article).toHaveClass('col-span-5')
    })

    it('does not apply col-span-5 class when isWideLayout is false', () => {
      const { container } = renderComponent({ isWideLayout: false })

      const article = container.querySelector('article')
      expect(article).not.toHaveClass('col-span-5')
    })
  })
})
