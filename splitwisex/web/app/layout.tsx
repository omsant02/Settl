import './globals.css'
import Providers from './providers'
import WalletConnect from '@/components/WalletConnect'
import Link from 'next/link'

export default function RootLayout({ children }: any) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900">
        <div className="max-w-5xl mx-auto p-6">
          <Providers>
            <header className="mb-6 flex items-center justify-between">
              <Link href="/" className="text-2xl font-semibold text-zinc-900 hover:text-blue-600 transition-colors cursor-pointer">
                SplitwiseX
              </Link>
              <WalletConnect />
            </header>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}


