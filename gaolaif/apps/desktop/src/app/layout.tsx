import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gaolaif — Security Workspace',
  description: 'Local-first AI security workspace for smart contract auditing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary font-mono antialiased">
        {children}
      </body>
    </html>
  )
}
