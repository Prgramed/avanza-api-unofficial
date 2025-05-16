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

Refer to [API.md](./API.md).

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

## Tests

Tests will not run without an `.env` file. Use the `.env-example` as reference.

```bash
$ npm test
```
## LICENSE

MIT license. See the LICENSE file for details.

## RESPONSIBILITIES

The author of this software is not responsible for any indirect damages (foreseeable or unforeseeable), such as, if necessary, loss or alteration of or fraudulent access to data, accidental transmission of viruses or of any other harmful element, loss of profits or opportunities, the cost of replacement goods and services or the attitude and behavior of a third party.
