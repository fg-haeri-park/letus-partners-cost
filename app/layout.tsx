import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LETUS 재무관리 시스템',
  description: '협력사 통합 재무관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
