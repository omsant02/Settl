import '../globals.css'
import Providers from '../providers'

export default function UploadLighthouseLayout({ children }: any) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900">
        <div className="max-w-5xl mx-auto p-6">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  )
}