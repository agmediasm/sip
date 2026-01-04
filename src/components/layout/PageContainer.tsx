import { colors } from '@/styles/theme'
import Head from 'next/head'

interface PageContainerProps {
  title: string
  description?: string
  children: React.ReactNode
  background?: 'noir' | 'onyx'
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: boolean
}

export function PageContainer({
  title,
  description,
  children,
  background = 'noir',
  maxWidth = 'xl',
  padding = true,
}: PageContainerProps) {
  const maxWidthValues = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%',
  }

  return (
    <>
      <Head>
        <title>{title} | SIP</title>
        {description && <meta name="description" content={description} />}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={colors.noir} />
      </Head>
      <main
        style={{
          minHeight: '100vh',
          background: colors[background],
          color: colors.ivory,
        }}
      >
        <div
          style={{
            maxWidth: maxWidthValues[maxWidth],
            margin: '0 auto',
            padding: padding ? '20px' : 0,
          }}
        >
          {children}
        </div>
      </main>
    </>
  )
}
