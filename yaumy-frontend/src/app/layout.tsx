import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Yaumy - AI Podcast Clipper',
  description: 'Transform your content into digestible clips',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}