// For local development, use:
// const Avanza = require('./dist/index.js')

// After publishing to npm, use:
// eslint-disable-next-line import/no-unresolved
const Avanza = require('avanza-api-unofficial')

const avanza = new Avanza()

async function example() {
  try {
    // Authenticate with your credentials
    await avanza.authenticate({
      username: 'YOUR_USERNAME',
      password: 'YOUR_PASSWORD',
      totpSecret: 'YOUR_TOTP_SECRET',
    })

    // Get account overview
    const overview = await avanza.getOverview()
    console.log('Account overview:', overview)

    // Get current positions
    const positions = await avanza.getPositions()
    console.log('Positions:', positions)

    // Subscribe to real-time quotes
    const unsubscribe = avanza.subscribe(
      Avanza.QUOTES,
      '5479', // Instrument ID
      quote => {
        console.log('Received quote:', quote)
      }
    )

    // Unsubscribe after 10 seconds
    setTimeout(() => {
      unsubscribe()
      avanza.disconnect()
    }, 10000)
  } catch (error) {
    console.error('Error:', error)
  }
}

example()
