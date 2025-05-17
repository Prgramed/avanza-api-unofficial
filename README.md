# avanza-api-unofficial

![CI](https://github.com/prgramed/avanza-api-unofficial/workflows/CI/badge.svg)
![npm version](https://img.shields.io/npm/v/avanza-api-unofficial.svg)
![npm downloads](https://img.shields.io/npm/dm/avanza-api-unofficial.svg)

A Node.js wrapper for the unofficial Avanza API. Created as most of the libraries out there are outdated or not maintained.
We will do our best to keep this up to date, but please create issues if you find any bugs or have feature requests on our GitHub page.

**⚠️ Disclaimer:** This is an unofficial API wrapper and is not affiliated with or endorsed by Avanza Bank AB. The underlying API can be changed or removed at any time without notice. Use at your own risk.

## Installation

Install via [npm](https://www.npmjs.com/package/avanza-api-unofficial)
```bash
$ npm install avanza-api-unofficial
```
## Documentation

Refer to [API.md](./API.md) for complete API documentation. The documentation is generated from JSDoc comments using jsdoc-to-markdown.

## Getting a TOTP Secret

Here are the steps to get your TOTP Secret:

0. Go to Profil > Inställningar > Sajtinställningar > Inloggning och utloggning > Användarnamn > Tvåfaktorsinloggning and click "Återaktivera". (Only do this step if you have already set up two-factor auth.)
1. Click "Aktivera" on the next screen.
2. Select "Annan app för tvåfaktorsinloggning".
3. Click "Kan du inte scanna QR-koden?" to reveal your TOTP Secret.
5. Finally, run `node -e "console.log(require('avanza-api-unofficial/dist/totp')('PASTE_YOUR_TOTP_SECRET_HERE'))"` to generate an initial code.
6. Done! From now on all you have to do is supply your secret in the `authenticate()` function as in the example below.

## Example

Authenticate and fetch currently held positions:

```javascript
import Avanza from 'avanza-api-unofficial'
const avanza = new Avanza()

avanza.authenticate({
  username: 'MY_USERNAME',
  password: 'MY_PASSWORD',
  totpSecret: 'MY_TOTP_SECRET'
}).then(async () => {
  const positions = await avanza.getPositions()
  console.log(positions)
})
```

Authenticate and subscribe to real-time data:

```javascript
import Avanza from 'avanza-api-unofficial'
const avanza = new Avanza()

avanza.authenticate({
  username: 'USERNAME',
  password: 'PASSWORD',
  totpSecret: 'MY_TOTP_SECRET'
}).then(() => {
  avanza.subscribe(Avanza.QUOTES, '5479', (quote) => {
    console.log('Received quote:', quote)
  })
})
```
## Documentation

Refer to [API.md](API.md).

## Testing

This project contains comprehensive tests for all API methods. Tests are run automatically:
- Before any commit (via pre-commit hook)
- During the release process

### Running Tests

Tests will run with or without credentials. If you don't provide credentials in a `.env` file, the API call tests will be skipped, but the path construction tests will still run.

1. Copy `.env.example` to `.env` and fill in your credentials
2. Run the tests:

```bash
# Run all tests
$ npm test

# Run tests with coverage report
$ npm run test:coverage
```

### Test Structure

- **Path Tests**: Verify all API endpoint paths are constructed correctly (runs without credentials)
- **API Tests**: Verify actual API calls work correctly (requires credentials)
- **No Real Trades**: The tests are designed to check functionality without placing any actual orders

### Testing in CI/CD

The GitHub Actions workflow runs the path tests automatically without requiring credentials.

## API Endpoint Maintenance

This library includes a tool to help detect changes in Avanza's API endpoints, which can change without notice.

### Endpoint Crawler

The endpoint crawler logs into Avanza's web interface using Puppeteer and monitors network traffic to detect API endpoints. This helps discover when endpoints have changed (e.g., from `/_mobile/` to `/_api/` paths).

```bash
# Install required dependencies if not already installed
npm install

# Run the endpoint crawler
npm run endpoint-crawler

# Run with comparison against current constants.js
npm run check-endpoints
```

See [ENDPOINT_CRAWLER.md](./scripts/ENDPOINT_CRAWLER.md) for detailed documentation on using the crawler and keeping the API up to date.
## LICENSE

MIT license. See the LICENSE file for details.

## RESPONSIBILITIES

The author of this software is not responsible for any indirect damages (foreseeable or unforeseeable), such as, if necessary, loss or alteration of or fraudulent access to data, accidental transmission of viruses or of any other harmful element, loss of profits or opportunities, the cost of replacement goods and services or the attitude and behavior of a third party.
