import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShopBot — AI Shopping Assistant',
  description: 'Find the perfect outdoor gear with the help of AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
