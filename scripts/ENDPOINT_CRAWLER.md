# Avanza API Endpoint Crawler

This tool helps track and detect changes in Avanza's API endpoints by automatically logging into the Avanza web interface and monitoring network traffic. It's designed to help keep the unofficial API wrapper up-to-date with Avanza's latest API changes.

## Purpose

The Avanza API is unofficial and undocumented, meaning it can change without notice. This crawler helps:

1. Detect when endpoints change from `/_mobile/` paths to `/_api/` paths
2. Discover new endpoints that could be implemented
3. Verify that existing endpoints still work
4. Generate documentation about available endpoints

## Requirements

- Node.js (v14 or higher)
- An Avanza account with two-factor authentication set up
- Your TOTP secret (see main README for instructions on getting this)

## Installation

```bash
# Install required dependencies
npm install puppeteer commander dotenv
```

## Configuration

Create or update your `.env` file in the project root with:

```
AVANZA_USERNAME=your_username
AVANZA_PASSWORD=your_password
AVANZA_TOTP_SECRET=your_totp_secret
```

## Usage

Run the crawler with default options:

```bash
node scripts/endpoint-crawler.js
```

### Command Line Options

```
Options:
  -V, --version                 output the version number
  -o, --output <path>           Output file for detected endpoints (default: "crawler-files/endpoints.json")
  -u, --username <username>     Avanza username (default: from .env)
  -p, --password <password>     Avanza password (default: from .env)
  -t, --totp-secret <secret>    TOTP secret for 2FA (default: from .env)
  -d, --debug                   Run browser in non-headless mode for debugging
  -r, --record <path>           Record HAR file of network traffic (default: "crawler-files/avanza-traffic.har")
  -c, --compare                 Compare detected endpoints with constants.js
  -s, --skip-login              Skip login and just check if crawler can detect API endpoints
  -w, --wait <milliseconds>     Wait time in ms between page navigations (default: 3000)
  -h, --help                    display help for command
```

### Common Use Cases

**1. Test endpoint detection without login:**
```bash
node scripts/endpoint-crawler.js --skip-login
```
This will:
- Visit public Avanza pages
- Test stock search functionality 
- Detect and save API endpoints without requiring credentials

**2. Debug with visible browser:**
```bash
node scripts/endpoint-crawler.js --debug
```
This will:
- Show the browser window during crawling
- Take screenshots at key points
- Save API responses from important endpoints

**3. Compare detected endpoints with constants.js:**
```bash
node scripts/endpoint-crawler.js --compare
```
This will:
- Crawl the Avanza website
- Compare detected endpoints with those in constants.js
- Generate a report of potential endpoint updates

**4. Increase wait time for more thorough request capture:**
```bash
node scripts/endpoint-crawler.js --wait 5000
```
This will:
- Wait 5 seconds between page navigations (instead of default 3)
- Allow more time for delayed API requests to complete
- Useful for slower connections or when many requests occur

### Example: Running with Debug Mode and Comparison

```bash
node scripts/endpoint-crawler.js --debug --compare
```

This will:
1. Launch a visible browser window so you can see what's happening
2. Log into Avanza and visit various pages
3. Detect all API endpoints used
4. Compare them with the current endpoints in `constants.js`
5. Generate a report of potential endpoint updates

## Output Files

The crawler generates these files:

1. `endpoints.json` - All detected endpoints categorized as mobile, api, or other
2. `avanza-traffic.har` - (Optional) HTTP Archive format file of all network traffic
3. `endpoint-updates.json` - (Optional) Recommended endpoint updates from mobile to API paths

## How to Update API Endpoints

When the crawler identifies potential endpoint updates:

1. **Test the new endpoints**: Before updating the library, test the detected endpoint to ensure it returns the expected data.

2. **Update constants.js**: Replace the old endpoint with the new one in `lib/constants.js`.

3. **Update response handling**: The response format might change with the new endpoint. You may need to transform the response to maintain backward compatibility, as seen in the `getOverview()` method.

4. **Update tests**: Modify the tests to handle the new response format and ensure they pass.

5. **Update documentation**: If the endpoint change introduces new fields or changes behavior, update the JSDoc comments and regenerate API.md.

## Example of an API Endpoint Update

Here's a real-world example of updating the account overview endpoint:

**1. Original endpoint in constants.js:**
```javascript
constants.paths.OVERVIEW_PATH = '/_mobile/account/overview'
```

**2. New endpoint discovered by crawler:**
```javascript
constants.paths.OVERVIEW_PATH = '/_api/trading-critical/rest/accounts'
```

**3. Updated method to handle new response format:**

```javascript
getOverview() {
  return this.call('GET', constants.paths.OVERVIEW_PATH)
    .then(accounts => {
      // Transform the response to maintain backward compatibility
      if (Array.isArray(accounts)) {
        const totalBalance = accounts.reduce((sum, account) => {
          const balance = account.currencyBalances && 
                        account.currencyBalances.length > 0 ? 
                        account.currencyBalances[0].balance : 0;
          return sum + balance;
        }, 0);
        
        return {
          accounts: accounts.map(account => ({
            accountId: account.accountId,
            accountType: account.accountType,
            name: account.name,
            totalBalance: account.currencyBalances && 
                        account.currencyBalances.length > 0 ? 
                        account.currencyBalances[0].balance : 0,
            positions: account.positions || []
          })),
          totalBalance: totalBalance
        };
      }
      
      // If the response is not in the expected format, return it as-is
      return accounts;
    });
}
## API Response Structure Documentation

It's helpful to document the response structure for each endpoint. The crawler can help with this by showing the actual data returned from the API. Here's how to document an API response:

1. Run the crawler with the `--record` option to capture network traffic
2. Open the generated HAR file
3. Find the response for the endpoint you're interested in
4. Document the key fields and their types in the JSDoc comments

## Scheduled Maintenance

It's recommended to run this crawler periodically (e.g., monthly) to detect API changes proactively. You could set up an automated workflow using GitHub Actions to run the crawler and notify maintainers of potential changes.

## Security Notes

- Never commit your credentials to the repository
- The script uses your real Avanza account, so be careful not to perform any actions that might affect your holdings
- If you're concerned about security, run this tool in a secure, isolated environment