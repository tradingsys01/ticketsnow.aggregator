/**
 * One-time script to generate YouTube OAuth2 token
 *
 * This script will:
 * 1. Open a browser window for you to authorize the app
 * 2. Generate a refresh token
 * 3. Save it to .env file
 *
 * Run: node scripts/generate-youtube-token.js
 */

const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Load client secret
const CLIENT_SECRET_PATH = path.join(__dirname, '../client_secret.json')
const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'))

const { client_id, client_secret, redirect_uris } = credentials.installed

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
)

// Define scopes
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
]

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Force to get refresh token
})

console.log('\n=== YouTube OAuth2 Token Generator ===\n')
console.log('This will authorize the app to access YouTube comments on your behalf.\n')
console.log('1. Open this URL in your browser:\n')
console.log(authUrl)
console.log('\n2. Authorize the application')
console.log('3. You will be redirected to localhost (it will fail - that\'s ok!)')
console.log('4. Copy the FULL URL from your browser address bar\n')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('Paste the redirect URL here: ', async (url) => {
  try {
    // Extract code from URL
    const code = new URL(url).searchParams.get('code')

    if (!code) {
      console.error('\nError: No authorization code found in URL')
      console.error('Make sure you copied the complete URL from the browser\n')
      rl.close()
      return
    }

    console.log('\nExchanging code for tokens...')

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    console.log('\n✅ Success! Tokens received\n')
    console.log('Access Token:', tokens.access_token ? 'Generated ✓' : 'Missing ✗')
    console.log('Refresh Token:', tokens.refresh_token ? 'Generated ✓' : 'Missing ✗')
    console.log('Expiry:', new Date(tokens.expiry_date || 0).toLocaleString())

    if (!tokens.refresh_token) {
      console.warn('\n⚠️  Warning: No refresh token received!')
      console.warn('This might happen if you\'ve authorized this app before.')
      console.warn('Try revoking access at: https://myaccount.google.com/permissions')
      console.warn('Then run this script again.\n')
    }

    // Update .env file
    const envPath = path.join(__dirname, '../.env')
    let envContent = ''

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }

    // Remove old YouTube OAuth entries
    envContent = envContent
      .split('\n')
      .filter(line => !line.startsWith('YOUTUBE_OAUTH_'))
      .join('\n')

    // Add new tokens
    const newEntries = [
      '',
      '# YouTube OAuth2 Tokens (for comments)',
      `YOUTUBE_OAUTH_CLIENT_ID="${client_id}"`,
      `YOUTUBE_OAUTH_CLIENT_SECRET="${client_secret}"`,
      `YOUTUBE_OAUTH_REDIRECT_URI="${redirect_uris[0]}"`,
      `YOUTUBE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token || ''}"`,
      ''
    ].join('\n')

    envContent += newEntries

    fs.writeFileSync(envPath, envContent)

    console.log('\n✅ Environment variables updated!')
    console.log(`\nUpdated: ${envPath}`)
    console.log('\nYou can now use the YouTube comments API.')
    console.log('Restart your dev server to apply the changes.\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.response) {
      console.error('Response:', error.response.data)
    }
  } finally {
    rl.close()
  }
})
