import './globals.css'
import SchemaMarkup from '@/components/SchemaMarkup'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/schema'
import { generateHomeMetadata } from '@/lib/metadata'

export const metadata = generateHomeMetadata()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Global schemas that appear on all pages
  const globalSchemas = [
    generateOrganizationSchema(),
    generateWebSiteSchema()
  ]

  return (
    <html lang="he" dir="rtl">
      <head>
        <SchemaMarkup schema={globalSchemas} />
      </head>
      <body>{children}</body>
    </html>
  )
}
