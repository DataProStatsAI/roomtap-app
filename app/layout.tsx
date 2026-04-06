import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RoomTap - Find Your Perfect Space',
  description: 'Find rooms, apartments, and houses for rent. List your property for free.',
  keywords: 'accommodation, rooms for rent, apartments, housing, RoomTap',
  authors: [{ name: 'RoomTap Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}