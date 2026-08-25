import { useTranslation } from 'react-i18next'

export default function SplashScreen() {
  const { t } = useTranslation()
  return (
    <div className="bg-brand-browser-top absolute inset-0 z-50 flex items-center justify-center">
      <img
        src="/start-page/logo.png"
        alt={t('home.logoAlt')}
        className="h-auto w-1/2 object-contain"
      />
    </div>
  )
}
