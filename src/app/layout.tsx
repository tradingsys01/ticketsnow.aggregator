import './globals.css'
import Script from 'next/script'
import SchemaMarkup from '@/components/SchemaMarkup'
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/schema'
import { generateHomeMetadata } from '@/lib/metadata'

export const metadata = generateHomeMetadata()

const GTM_ID = 'GTM-TBCG3Z5H'

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
        {/* Google Tag Manager */}
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  )
}
