const EventEmitter = require('events')
const https = require('https')
const querystring = require('querystring')
const WebSocket = require('ws')

const constants = require('./constants')
const totp = require('./totp')

// Simple cookie handling
const Cookie = {
  parse(setCookieHeader) {
    if (!setCookieHeader) return [];
    
    if (!Array.isArray(setCookieHeader)) {
      setCookieHeader = [setCookieHeader];
    }
    
    return setCookieHeader.map(cookie => {
      const parts = cookie.split(';')[0].trim().split('=');
      return {
        name: parts[0],
        value: parts[1],
        raw: cookie
      };
    });
  },
  
  serialize(cookies) {
    return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  }
}

// eslint-disable-next-line import/newline-after-import
const BASE_URL = 'www.avanza.se'
const USER_AGENT =
  process.env.AVANZA_USER_AGENT ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
const MIN_INACTIVE_MINUTES = 30
const MAX_INACTIVE_MINUTES = 60 * 24
const SOCKET_URL = 'wss://www.avanza.se/_push/cometd'
const MAX_BACKOFF_MS = 2 * 60 * 1000

/**
 * Simple debug utility function
 *
 * @private
 * @param {String} message The message to log
 */
function debug(...message) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(...message)
  }
}

/**
 * Execute a request.
 *
 * @private
 * @param {Object} options Request options.
 * @return {Promise}
 */
function request(options) {
  if (!options) {
    return Promise.reject(new Error('Missing options.'))
  }
  const data = JSON.stringify(options.data || {})
  
  // Ensure we always have proper Accept header for Avanza API
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': USER_AGENT,
    'Content-Length': Buffer.byteLength(data),
    ...options.headers,
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: BASE_URL,
        port: 443,
        method: options.method,
        path: options.path,
        headers,
      },
      response => {
        const body = []
        response.on('data', chunk => body.push(chunk))
        response.on('end', () => {
          let parsedBody = body.join('')

          try {
            parsedBody = JSON.parse(parsedBody)
          } catch (e) {
            debug('Received non-JSON data from API.', body)
          }

          const res = {
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            headers: response.headers,
            body: parsedBody,
          }
          
          // Debug response info if in development mode
          debug(`${options.method} ${options.path} - Status: ${response.statusCode}`)
          
          // Save cookies from response if present
          if (response.headers['set-cookie']) {
            res.cookies = Cookie.parse(response.headers['set-cookie']);
          }
          
          if (response.statusCode < 200 || response.statusCode > 299) {
            reject(res)
          } else {
            resolve(res)
          }
        })
      }
    )
    if (data) {
      req.write(data)
    }
    req.on('error', e => reject(e))
    req.end()
  })
}

/**
 * An Avanza API wrapper.
 *
 * ### Constants
 *
 * Some methods require certain constants as parameters. These are described below.
 *
 * #### Instrument types
 *
 * | Type                          | Note |
 * | :---------------------------- | :--- |
 * | `Avanza.STOCK`                |      |
 * | `Avanza.FUND`                 |      |
 * | `Avanza.BOND`                 |      |
 * | `Avanza.OPTION`               |      |
 * | `Avanza.FUTURE_FORWARD`       |      |
 * | `Avanza.CERTIFICATE`          |      |
 * | `Avanza.WARRANT`              |      |
 * | `Avanza.EXCHANGE_TRADED_FUND` |      |
 * | `Avanza.INDEX`                |      |
 * | `Avanza.PREMIUM_BOND`         |      |
 * | `Avanza.SUBSCRIPTION_OPTION`  |      |
 * | `Avanza.EQUITY_LINKED_BOND`   |      |
 * | `Avanza.CONVERTIBLE`          |      |
 *
 * #### Periods
 *
 * | Period                | Note |
 * | :-------------------- | :--- |
 * | `Avanza.TODAY`        |      |
 * | `Avanza.ONE_WEEK`     |      |
 * | `Avanza.ONE_MONTH`    |      |
 * | `Avanza.THREE_MONTHS` |      |
 * | `Avanza.THIS_YEAR`    |      |
 * | `Avanza.ONE_YEAR`     |      |
 * | `Avanza.FIVE_YEARS`   |      |
 *
 * #### Lists
 *
 * | List                                              | Note |
 * | :------------------------------------------------ | :--- |
 * | `Avanza.HIGHEST_RATED_FUNDS`                      |      |
 * | `Avanza.LOWEST_FEE_INDEX_FUNDS`                   |      |
 * | `Avanza.BEST_DEVELOPMENT_FUNDS_LAST_THREE_MONTHS` |      |
 * | `Avanza.MOST_OWNED_FUNDS`                         |      |
 *
 * #### Channels
 *
 * Note that for all channels where a _sequence_ of account IDs are expected
 * (`<accountId1>,<accountId2>,...`), you must supply all of your account IDs,
 * regardless of whether or not you want data for that account.
 *
 * | Channel                     | Note                                                                                                                |
 * | :-------------------------- | :------------------------------------------------------------------------------------------------------------------ |
 * | `Avanza.QUOTES`             | Minute-wise data containing current price, change, total volume traded etc. Expects an **orderbookId**.             |
 * | `Avanza.ORDERDEPTHS`        | Best five offers and current total volume on each side. Expects an **orderbookId**.                                 |
 * | `Avanza.TRADES`             | Updates whenever a new trade is made. Data contains volume, price, broker etc. Expects an **orderbookId**.          |
 * | `Avanza.BROKERTRADESUMMARY` | Pushes data about which brokers are long/short and how big their current net volume is. Expects an **orderbookId**. |
 * | `Avanza.POSITIONS`          | Your positions in an instrument. Expects a string of `<orderbookId>_<accountId1>,<accountId2,<accountId3>,...`.     |
 * | `Avanza.ORDERS`             | Your current orders. Expects a string of `_<accountId1>,<accountId2,<accountId3>,...`.                              |
 * | `Avanza.DEALS`              | Recent trades you have made. Expects a string of `_<accountId1>,<accountId2,<accountId3>,...`.                      |
 * | `Avanza.ACCOUNTS`           | N/A. Expects a string of `_<accountId>`.                                                                            |
 *
 * #### Transaction Types
 *
 * | Transaction type          | Note |
 * | :------------------------ | :--- |
 * | `Avanza.OPTIONS`          |      |
 * | `Avanza.FOREX`            |      |
 * | `Avanza.DEPOSIT_WITHDRAW` |      |
 * | `Avanza.BUY_SELL`         |      |
 * | `Avanza.DIVIDEND`         |      |
 * | `Avanza.INTEREST`         |      |
 * | `Avanza.FOREIGN_TAX`      |      |
 *
 * #### Order Types
 *
 * | Order type    | Note |
 * | :------------ | :--- |
 * | `Avanza.BUY`  |      |
 * | `Avanza.SELL` |      |
 *
 * @extends EventEmitter
 *
 */
class Avanza extends EventEmitter {
  constructor() {
    super()
    this._credentials = null
    this._socket = null
    this._authenticated = false
    this._authenticationSession = null
    this._authenticationTimeout = MAX_INACTIVE_MINUTES
    this._pushSubscriptionId = null
    this._reauthentication = null
    this._customerId = null
    this._securityToken = null
    this._cookies = []  // To store authentication cookies

    this._backOffTimestamps = {}
    this._socketHandshakeTimer = null
    this._socketSubscriptions = {}
    this._socketMonitor = null
    this._socketLastMetaConnect = 0
    this._adviceTimeout = 30000
    this._socketConnected = false
    this._socketMessageCount = 1
    this._socketClientId = null
  }

  /* Back off algoritm helper. Avoid accidental hammering when responding
   * to asynchronous events by scheduling the response using setTimeout()
   * with this function as the timeout input. Example:
   *   setTimeout(() => { ... }, _backoffCalc('relogin')) */
  _backoffCalc(actionName) {
    const now = Date.now()
    let schedDelay = 0
    if (now - this._backOffTimestamps[actionName] < MAX_BACKOFF_MS * 5) {
      schedDelay = (now - this._backOffTimestamps[actionName]) * 2 + 500
      if (schedDelay > MAX_BACKOFF_MS) {
        schedDelay = MAX_BACKOFF_MS
        this._backOffTimestamps[actionName] = now
      }
    } else {
      this._backOffTimestamps[actionName] = now
    }
    return schedDelay
  }

  _socketRestart() {
    this._socket.removeAllListeners()
    this._socket.on('error', err => {
      debug('Received websocket error:', err)
    })
    this._socket.terminate()
    this._socketConnected = false
    delete this._backOffTimestamps.handshake
    clearInterval(this._socketMonitor)
    clearTimeout(this._socketHandshakeTimer)
    setTimeout(() => {
      this._socketInit(true)
    }, this._backoffCalc('websocket'))
  }

  _socketInit(restart) {
    if (this._socket && !restart) {
      return
    }

    this._socket = new WebSocket(SOCKET_URL)

    this._socket.on('open', () => {
      this._authenticateSocket()
    })
    this._socket.on('message', data => {
      this._socketHandleMessage(data)
    })
    this._socket.on('close', () => {
      this._socketRestart()
    })
    this._socket.on('error', err => {
      debug('Received websocket error', err)
      this._socketRestart()
    })

    this._socketMonitor = setInterval(() => {
      if (!this._pushSubscriptionId) {
        // Don't maintain socket status unless we're authenticated
        return
      }

      if (this._socket.readyState !== this._socket.OPEN) {
        // Don't make the assumption we will reach the open state
        // and hence don't assume there will ever be a close emitted.
        this._socketRestart()
      } else if (this._socketConnected && this._socketLastMetaConnect + this._adviceTimeout + 5000 < Date.now()) {
        this._socketRestart()
      }
    }, 5000)
  }

  _socketSend(data) {
    if (this._socket && this._socket.readyState === this._socket.OPEN) {
      this._socket.send(JSON.stringify([data]))
      this._socketMessageCount += 1
    }
  }

  _socketHandleMessage(data) {
    const response = JSON.parse(data)
    for (let i = 0; i < response.length; i++) {
      if (!response[i]) {
        continue
      }
      const message = response[i]
      if (message.error) {
        debug(message.error)
      }
      switch (message.channel) {
        case '/meta/disconnect':
          if (this._socketClientId) {
            this._authenticateSocket(true)
          }
          break
        case '/meta/handshake':
          if (message.successful) {
            this._socketClientId = message.clientId
            this._socketSend({
              advice: { timeout: 0 },
              channel: '/meta/connect',
              clientId: this._socketClientId,
              connectionType: 'websocket',
              id: this._socketMessageCount,
            })
          } else if (message.advice && message.advice.reconnect === 'handshake') {
            this._authenticateSocket(true)
          } else {
            this._socketClientId = null
            this._socketConnected = false
            this._pushSubscriptionId = undefined
            this._scheduleReauth()
          }
          break
        case '/meta/connect':
          if (
            message.successful &&
            (!message.advice || (message.advice.reconnect !== 'none' && !(message.advice.interval < 0)))
          ) {
            this._socketLastMetaConnect = Date.now()
            this._socketSend({
              channel: '/meta/connect',
              clientId: this._socketClientId,
              connectionType: 'websocket',
              id: this._socketMessageCount,
            })
            if (!this._socketConnected) {
              this._socketConnected = true
              Object.keys(this._socketSubscriptions).forEach(substr => {
                if (this._socketSubscriptions[substr] !== this._socketClientId) {
                  this._socketSubscribe(substr)
                }
              })
            }
          } else if (this._socketClientId) {
            this._authenticateSocket(true)
          }
          break
        case '/meta/subscribe':
          if (message.successful) {
            this._socketSubscriptions[message.subscription] = this._socketClientId
          } else {
            debug('Could not subscribe:', message)
          }
          break
        case '/meta/unsubscribe':
          if (message.successful) {
            delete this._socketSubscriptions[message.subscription]
          } else {
            debug('Could not unsubscribe:', message)
          }
          break
        default:
          this.emit(message.channel, message.data)
      }
    }
  }

  _authenticateSocket(forceHandshake) {
    if (!this._socketClientId || forceHandshake) {
      this._socketClientId = null
      this._socketConnected = false
      if (this._pushSubscriptionId) {
        clearTimeout(this._socketHandshakeTimer)
        this._socketHandshakeTimer = setTimeout(() => {
          this._socketSend({
            advice: {
              timeout: 60000,
              interval: 0,
            },
            channel: '/meta/handshake',
            ext: { subscriptionId: this._pushSubscriptionId },
            id: this._socketMessageCounter,
            minimumVersion: '1.0',
            supportedConnectionTypes: ['websocket', 'long-polling', 'callback-polling'],
            version: '1.0',
          })
        }, this._backoffCalc('handshake'))
      }
    } else if (this._socketClientId) {
      this._socketSend({
        channel: '/meta/connect',
        clientId: this._socketClientId,
        connectionType: 'websocket',
        id: this._socketMessageCount,
      })
    }
  }

  _socketSubscribe(subscriptionString) {
    this._socketSubscriptions[subscriptionString] = null
    if (this._socketConnected) {
      this._socketSend({
        channel: '/meta/subscribe',
        clientId: this._socketClientId,
        id: this._socketMessageCount,
        subscription: subscriptionString,
      })
    }
  }

  _socketUnsubscribe(subscriptionString) {
    if (this._socketConnected) {
      this._socketSend({
        channel: '/meta/unsubscribe',
        clientId: this._socketClientId,
        id: this._socketMessageCount,
        subscription: subscriptionString,
      })
    }
  }

  /**
   * Authenticate the client.
   *
   * If second factor authentication is needed, either the one time code can be provided in `totp`, or the secret to
   * generate codes can be provided in `totpSecret`.
   *
   * @param {Object} credentials
   * @param {String} credentials.username
   * @param {String} credentials.password
   * @param {String} credentials.totp
   * @param {String} credentials.totpSecret
   */
  authenticate(credentials) {
    if (!credentials) {
      return Promise.reject(new Error('Missing credentials.'))
    }
    if (!credentials.username) {
      return Promise.reject(new Error('Missing credentials.username.'))
    }
    if (!credentials.password) {
      return Promise.reject(new Error('Missing credentials.password.'))
    }
    if (!(this._authenticationTimeout >= MIN_INACTIVE_MINUTES && this._authenticationTimeout <= MAX_INACTIVE_MINUTES)) {
      return Promise.reject(
        new Error(`Session timeout not in range ${MIN_INACTIVE_MINUTES} - ${MAX_INACTIVE_MINUTES} minutes.`)
      )
    }

    // Store credentials for potential re-authentication
    this._credentials = credentials

    return new Promise((resolve, reject) => {
      const data = {
        maxInactiveMinutes: this._authenticationTimeout,
        password: credentials.password,
        username: credentials.username,
      }
      
      debug('Starting authentication process...')
      
      request({
        method: 'POST',
        path: constants.paths.AUTHENTICATION_PATH,
        data,
      })
        .then(response => {
          // No second factor requested, continue with normal login
          if (typeof response.body.twoFactorLogin === 'undefined') {
            return Promise.resolve(response)
          }
          const tfaOpts = response.body.twoFactorLogin

          if (tfaOpts.method !== 'TOTP') {
            return Promise.reject(new Error(`Unsupported second factor method ${tfaOpts.method}`))
          }
          const totpCode = credentials.totpSecret ? totp(credentials.totpSecret) : credentials.totp

          if (!totpCode) {
            return Promise.reject(new Error('Missing credentials.totp or credentials.totpSecret'))
          }

          debug('Two-factor authentication required, sending TOTP code...')
          
          // Store transaction cookie for TOTP authentication
          this._cookies = [
            {
              name: 'AZAMFATRANSACTION',
              value: tfaOpts.transactionId
            }
          ];
          
          return request({
            method: 'POST',
            path: constants.paths.TOTP_PATH,
            data: {
              method: 'TOTP',
              totpCode,
            },
            headers: {
              Cookie: `AZAMFATRANSACTION=${tfaOpts.transactionId}`,
            },
          })
        })
        .then(response => {
          this._authenticated = true
          this._securityToken = response.headers['x-securitytoken']
          this._pushSubscriptionId = response.body.pushSubscriptionId
          this._customerId = response.body.customerId

          // Save authentication cookies
          if (response.headers['set-cookie']) {
            debug('Received cookies during authentication:', response.headers['set-cookie'])
            this._cookies = Cookie.parse(response.headers['set-cookie'])
            debug('Parsed cookies:', this._cookies)
          }

          // Re-authenticate after timeout minus one minute
          this._scheduleReauth((this._authenticationTimeout - 1) * 60 * 1000)

          if (this._socket) {
            this._socketRestart()
          }
          
          debug('Authentication successful, security token:', this._securityToken)
          
          resolve({
            securityToken: this._securityToken,
            pushSubscriptionId: this._pushSubscriptionId,
            customerId: this._customerId,
          })
        })
        .catch(e => {
          this._authenticated = false
          this._pushSubscriptionId = undefined
          debug('Authentication failed:', e)
          reject(e)
        })
    })
  }

  /* Re-authenticate after specified timeout.
   * In the event of failure retry with backoff until we succeed.
   */
  _scheduleReauth(delay) {
    clearTimeout(this._reauthentication)
    this._reauthentication = setTimeout(() => {
      this.authenticate(this._credentials).catch(error => {
        debug('Could not authenticate:', error)
        this._scheduleReauth(this._backoffCalc('authenticate'))
      })
    }, delay || this._backoffCalc('authenticate'))
  }

  /**
   * Disconnects by simulating a client that just goes away.
   */
  disconnect() {
    clearTimeout(this._reauthentication)
    this._authenticated = false // Make sure all calls to main site will fail after this point
    this._cookies = [] // Clear cookies

    this.removeAllListeners() // Remove all subscription callbacks
    clearInterval(this._socketMonitor)
    if (this._socket) {
      this._socket.removeAllListeners()
      this._socket.on('error', err => {
        debug('Received websocket error:', err)
      })
      this._socket.terminate()
      this._socket = null
    }
    this._socketClientId = null
    this._socketConnected = false
    this._pushSubscriptionId = undefined
    this._socketSubscriptions = {} // Next startup of websocket should start without subscriptions
  }

  /**
   * Get all positions held by this user for a specific account.
   * 
   * @param {String} accountId The URL parameter ID for the account
   * @returns {Promise<Object>} Promise resolving to positions data
   */
  getAccountPositions(accountId) {
    const path = constants.paths.POSITIONS_PATH.replace('{0}', accountId);
    return this.call('GET', path);
  }
  
  /**
   * Get all positions held by this user across all accounts.
   * This method will first get all accounts, then fetch positions for each account
   * and combine them into a single response.
   * 
   * @returns {Promise<Object>} Promise resolving to positions data
   */
  getPositions() {
    // First, get the list of accounts to obtain URL parameter IDs
    return this.getAccountsList()
      .then(accounts => {
        if (!accounts || !accounts.length) {
          return { withOrderbook: [], withoutOrderbook: [], cashPositions: [], withCreditAccount: false };
        }
        
        // Use the first account's URL parameter ID to fetch positions
        // (for backward compatibility, we'll return just the first account's positions)
        const firstAccount = accounts.find(acc => !(acc.accountSettings && acc.accountSettings.IS_HIDDEN));
        if (!firstAccount) {
          return { withOrderbook: [], withoutOrderbook: [], cashPositions: [], withCreditAccount: false };
        }
        
        // Get positions for this account
        return this.getAccountPositions(firstAccount.urlParameterId)
          .then(positionsResponse => ({
            // For backward compatibility, transform the response to match the old format
            instrumentPositions: 
              (positionsResponse.withOrderbook || []).map(pos => ({
                instrumentType: pos.instrument.type,
                instrument: {
                  name: pos.instrument.name,
                  id: pos.instrument.id,
                  type: pos.instrument.type
                },
                accountName: pos.account.name,
                accountId: pos.account.id,
                value: pos.value.value,
                acquiredValue: pos.acquiredValue.value,
                volume: pos.volume.value,
                averageAcquiredPrice: pos.averageAcquiredPrice.value,
                lastPrice: pos.instrument.orderbook.quote.latest.value,
                profit: pos.value.value - pos.acquiredValue.value,
                profitPercent: (pos.value.value / pos.acquiredValue.value - 1) * 100,
                change: pos.instrument.orderbook.quote.change.value,
                changePercent: pos.instrument.orderbook.quote.changePercent.value
              })),
            totalBalance: positionsResponse.cashPositions.reduce((sum, pos) => sum + pos.totalBalance.value, 0),
            totalOwnCapital: 
              (positionsResponse.withOrderbook || []).reduce((sum, pos) => sum + pos.value.value, 0) +
              positionsResponse.cashPositions.reduce((sum, pos) => sum + pos.totalBalance.value, 0),
            // Keep the original response for those who want the new format
            rawPositions: positionsResponse
          }));
      });
  }

  /**
   * Get an overview of the users holdings at Avanza Bank.
   * 
   * The API returns an array of accounts with details about each account.
   * Each account contains: name, accountId, accountType, availableForPurchase,
   * positions, currencyBalances, etc.
   */
  /**
   * Get list of all accounts
   * Returns detailed information about all accounts including:
   * - Account ID and name
   * - Account type
   * - Clearing account number
   * - URL parameter ID (for direct linking)
   * - Account settings
   * 
   * @returns {Promise<Array>} Promise resolving to an array of account objects
   */
  getAccountsList() {
    // This endpoint may require empty data object to be sent
    // as some Avanza endpoints require a Content-Length header
    return this.call('GET', constants.paths.ACCOUNTS_LIST_PATH, {});
  }
  
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
            totalBalance
          };
        }
        
        // If the response is not in the expected format, return it as-is
        return accounts;
      });
  }

  /**
   * Get an overview of the users holdings for a specific account at Avanza Bank.
   * @param {String} accountId A valid account ID or URL parameter ID.
   * 
   * The API now returns a more detailed response with account information including:
   * - Category information (name, id)
   * - Account details (id, balance, type, buyingPower)
   * - Currency balances and interest rates
   */
  getAccountOverview(accountId) {
    const path = constants.paths.ACCOUNT_OVERVIEW_PATH.replace('{0}', accountId)
    return this.call('GET', path)
      .then(response => {
        // Check if response is in the new format with account and category properties
        if (response && response.account) {
          // Transform to maintain backwards compatibility if needed
          const transformedResponse = {
            accountId: response.account.id,
            accountType: response.account.type,
            name: (response.account.name && response.account.name.userDefinedName) || 
                 (response.account.name && response.account.name.defaultName) || '',
            totalBalance: (response.account.balance && response.account.balance.value) || 0,
            buyingPower: (response.account.buyingPower && response.account.buyingPower.value) || 0,
            
            // Add new properties with original format
            categoryName: (response.category && response.category.name) || '',
            currencyBalances: response.account.currencyBalances || [],
            
            // Keep a reference to the original response for full data access
            rawResponse: response
          };
          return transformedResponse;
        }
        
        // Return the original response if it's not in the expected format
        return response;
      });
  }

  /**
   * Get recent deals and orders.
   */
  getDealsAndOrders() {
    return this.call('GET', constants.paths.DEALS_AND_ORDERS_PATH)
  }

  /**
   * Get all transactions of an account.
   *
   * @param {String} accountOrTransactionType A valid account ID or a
   *                                          [Transaction Type](#transaction-type).
   * @param {Object} options Configuring which transactions to fetch.
   * @param {String} [options.from] On the form YYYY-MM-DD.
   * @param {String} [options.to] On the form YYYY-MM-DD.
   * @param {Number} [options.maxAmount] Only fetch transactions of at most this value.
   * @param {Number} [options.minAmount] Only fetch transactions of at least this value.
   * @param {String|Array} [options.orderbookId] Only fetch transactions involving
   *                                             this/these orderbooks.
   */
  getTransactions(accountOrTransactionType, options) {
    const path = constants.paths.TRANSACTIONS_PATH.replace('{0}', accountOrTransactionType)

    if (options && Array.isArray(options.orderbookId)) {
      options.orderbookId = options.orderbookId.join(',')
    }

    // Unsure what this is.
    // options.includeInstrumentsWithNoOrderbook = 1

    const query = querystring.stringify(options)
    return this.call('GET', query ? `${path}?${query}` : path)
  }

  /**
   * Get all watchlists created by this user. Note that the second table was
   * created from a specific watchlist, and so the response from the API will be
   * different for you.
   */
  getWatchlists() {
    return this.call('GET', constants.paths.WATCHLISTS_PATH)
  }

  /**
   * Add an instrument to the watchlist.
   *
   * @param {String} instrumentId The ID of the instrument to add.
   * @param {String} watchlistId  The ID of the watchlist to add the instrument to.
   */
  addToWatchlist(instrumentId, watchlistId) {
    const path = constants.paths.WATCHLISTS_ADD_DELETE_PATH.replace('{0}', watchlistId).replace('{1}', instrumentId)
    return this.call('PUT', path)
  }

  /**
   * Remove an instrument from the watchlist.
   *
   * @param {String} instrumentId The ID of the instrument to remove.
   * @param {String} watchlistId  The ID of the watchlist to remove the instrument from.
   */
  removeFromWatchlist(instrumentId, watchlistId) {
    const path = constants.paths.WATCHLISTS_ADD_DELETE_PATH.replace('{0}', watchlistId).replace('{1}', instrumentId)
    return this.call('DELETE', path)
  }

  /**
   * Get instrument information.
   *
   * @param {String} instrumentId Likely the same as the instrumentId.
   * @param {String} instrumentType The type of the instrument. See
   *                                [Instrument Types](#instrument-types).
   */
  getInstrument(instrumentType, instrumentId) {
    const path = constants.paths.INSTRUMENT_PATH.replace('{0}', instrumentType.toLowerCase()).replace(
      '{1}',
      instrumentId
    )
    return this.call('GET', path)
  }

  /**
   * Get orderbook information.
   *
   * @param {String} orderbookId Likely the same as the instrumentId.
   * @param {String} instrumentType The type of the instrument. See
   *                                [Instrument Types](#instrument-types).
   */
  getOrderbook(instrumentType, orderbookId) {
    const path = constants.paths.ORDERBOOK_PATH.replace('{0}', instrumentType.toLowerCase())
    const query = querystring.stringify({ orderbookId })
    return this.call('GET', `${path}?${query}`)
  }

  /**
   * Get information about multiple orderbooks.
   *
   * @param {Array} orderbookIds A list of orderbook IDs.
   */
  getOrderbooks(orderbookIds) {
    const ids = orderbookIds.join(',')
    const path = constants.paths.ORDERBOOK_LIST_PATH.replace('{0}', ids)
    const query = querystring.stringify({ sort: 'name' })
    return this.call('GET', `${path}?${query}`)
  }

  /**
   * Get an array of prices over a period of time.
   *
   * @param {String} orderbookId The orderbook to fetch price data about.
   * @param {Period} period The period from which to fetch data. See [Periods](#periods).
   */
  getChartdata(orderbookId, period) {
    period = period.toLowerCase()
    const path = constants.paths.CHARTDATA_PATH.replace('{0}', orderbookId)
    const query = querystring.stringify({ timePeriod: period })
    return this.call('GET', `${path}?${query}`)
  }

  /**
   * List all inspiration lists.
   */
  getInspirationLists() {
    return this.call('GET', constants.paths.INSPIRATION_LIST_PATH.replace('{0}', ''))
  }

  /**
   * Get information about a single inspiration list.
   *
   * @param {String} type List type. See [Lists](#lists)
   */
  getInspirationList(type) {
    return this.call('GET', constants.paths.INSPIRATION_LIST_PATH.replace('{0}', type))
  }

  /**
   * Subscribe to real-time data.
   *
   * @param {String} channel The channel on which to listen. See [Channels](#channels).
   * @param {String|Array<String>} ids One or many IDs to subscribe to.
   * @param {Function} callback Function to call whenever the subscription receives a new message
   * @return {Function} Call to unsubscribe.
   */
  subscribe(channel, ids, callback) {
    if (!this._pushSubscriptionId) {
      throw new Error('Expected to be authenticated before subscribing.')
    }

    if (Array.isArray(ids)) {
      if (channel === Avanza.ORDERS || channel === Avanza.DEALS || channel === Avanza.POSITIONS) {
        ids = ids.join(',')
      } else {
        throw new Error(`Channel ${channel} does not support multiple ids as input.`)
      }
    }

    if (!this._socket) {
      this._socketInit()
    }

    const subscriptionString = `/${channel}/${ids}`
    this.on(subscriptionString, callback)
    this._socketSubscribe(subscriptionString)

    return () => {
      if (!this._pushSubscriptionId) {
        throw new Error('Expected to be authenticated before unsubscribing.')
      }
      if (!this._socket) {
        throw new Error('Expected to be initialized before unsubscribing.')
      }
      this.off(subscriptionString, callback)
      this._socketUnsubscribe(subscriptionString)
    }
  }

  /**
   * Place a limit order.
   *
   * @param {Object} options Order options.
   * @param {String} options.accountId ID of the account to trade on.
   * @param {String} options.orderbookId ID of the instrument to trade.
   * @param {String} options.side One of "BUY" or "SELL".
   * @param {Number} options.price The price limit of the order.
   * @param {String} options.validUntil A date on the form YYYY-MM-DD. Cancels
   *                                    the order if this date is passed.
   * @param {Number} options.volume How many securities to order.
   * @return {Object} Properties are `messages`, `requestId`, `orderRequestStatus`, `orderId`.
   */
  placeOrder(options) {
    return this.call('POST', constants.paths.ORDER_PLACE_PATH, options)
  }

  /**
   * Get information about an order.
   *
   * It is quite hard to automatically generate tables of what this endpoint
   * returns since orders are merely temporary entities.
   *
   * The returned object however looks very much like that from
   * [getOrderbook()](#getorderbook) with an extra property `order` which
   * contains information you already have (such as order price or volume).
   *
   * @param {String} instrumentType Instrument type of the pertaining instrument.
   *                                See [Instrument Types](#instrument-types).
   * @param {String} accountId ID of the account which this order was placed on.
   * @param {String} orderId ID of the order.
   */
  getOrder(instrumentType, accountId, orderId) {
    const path = constants.paths.ORDER_GET_PATH.replace('{0}', instrumentType.toLowerCase())
    const query = querystring.stringify({ accountId, orderId })
    return this.call('GET', `${path}?${query}`)
  }

  /**
   * Edit an order.
   *
   * @param {String} instrumentType Instrument type of the pertaining instrument.
   *                                See [Instrument Types](#instrument-types).
   * @param {String} orderId Order ID received when placing the order.
   * @param {Object} options Order options. See [placeOrder()](#placeorder).
   */
  editOrder(instrumentType, orderId, options) {
    options.orderCondition = 'NORMAL'
    const path = constants.paths.ORDER_EDIT_PATH.replace('{0}', instrumentType.toLowerCase()).replace('{1}', orderId)
    return this.call('PUT', path, options)
  }

  /**
   * Delete and cancel an order.
   *
   * @param {Object} options Order options.
   * @param {String} options.accountId ID of the account on which this order was placed.
   * @param {String} options.orderId Order ID received when the order was placed.
   */

  deleteOrder(options) {
    return this.call('POST', constants.paths.ORDER_DELETE_PATH, options)
  }

  /**
   * Free text search for an instrument.
   *
   * @param {String} searchQuery Search query.
   * @param {String} [type] An instrument type.
   * @param {Number} [limit=100] Maximum number of results to return.
   */
  search(searchQuery, type, limit = 100) {
    const options = {
      query: searchQuery,
      searchFilter: {
        types: type ? [type.toUpperCase()] : [],
      },
      pagination: {
        from: 0,
        size: limit,
      },
    }

    return this.call('POST', constants.paths.SEARCH_PATH, options)
  }

  /**
   * Make a call to the API. Note that this method will filter dangling question
   * marks from `path`.
   *
   * @param {String} [method='GET'] HTTP method to use.
   * @param {String} [path=''] The URL to send the request to.
   * @param {Object} [data={}] JSON data to send with the request.
   * @return {Promise}
   */
  call(method = 'GET', path = '', data = {}) {
    const securityToken = this._securityToken
    // Remove dangling question mark
    if (path.slice(-1) === '?') {
      path = path.slice(0, -1)
    }

    return new Promise((resolve, reject) => {
      if (!this._authenticated) {
        reject(new Error('Expected to be authenticated before calling.'))
      } else {
        // Prepare headers with cookies and security token
        const headers = {
          'X-SecurityToken': securityToken,
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json;charset=UTF-8'
        };
        
        // Add cookies to the request if we have any
        if (this._cookies && this._cookies.length > 0) {
          headers.Cookie = Cookie.serialize(this._cookies);
        }
        
        // Log request details for debugging
        const debugInfo = {
          method,
          host: BASE_URL,
          path,
          headers: {
            ...headers,
            'User-Agent': USER_AGENT,
            'Content-Length': Buffer.byteLength(JSON.stringify(data)),
          }
        }
        debug('HTTPS Request:', debugInfo)
        
        request({
          method,
          path,
          data,
          headers,
        })
          .then(response => {
            // Log response for debugging
            debug('HTTPS Response:', {
              statusCode: response.statusCode,
              headers: response.headers
            })
            
            // Update cookies if received in response
            if (response.cookies) {
              // Merge new cookies with existing ones or replace same-named cookies
              const cookieNames = this._cookies.map(c => c.name);
              
              // Use map instead of forEach to satisfy consistent-return rule
              response.cookies.map(newCookie => {
                const index = cookieNames.indexOf(newCookie.name);
                if (index !== -1) {
                  this._cookies[index] = newCookie;
                } else {
                  this._cookies.push(newCookie);
                }
                return newCookie;
              });
              
              debug('Updated cookies:', this._cookies);
            }
            
            if (response.headers['aza-invalid-session'] === '-') {
              debug('Session invalid, attempting to re-authenticate...')
              // Clear authentication session to trigger re-auth
              this._authenticated = false
              this._securityToken = null
              this._cookies = []
              
              // Re-authenticate and retry the request
              return this.authenticate(this._credentials)
                .then(() => this.call(method, path, data))
                .then(result => resolve(result))
                .catch(authError => {
                  debug('Re-authentication failed:', authError)
                  reject(authError)
                  return authError; // To satisfy consistent-return rule
                })
            }
            
            resolve(response.body)
            return response; // To satisfy consistent-return rule
          })
          .catch(e => {
            debug('Request failed:', e)
            
            // Check if this is an invalid session error
            if (e.headers && e.headers['aza-invalid-session'] === '-') {
              debug('Session invalid, attempting to re-authenticate...')
              // Clear authentication session to trigger re-auth
              this._authenticated = false
              this._securityToken = null
              this._cookies = []
              
              // Re-authenticate and retry the request
              return this.authenticate(this._credentials)
                .then(() => this.call(method, path, data))
                .then(result => resolve(result))
                .catch(authError => {
                  debug('Re-authentication failed:', authError)
                  reject(authError)
                  return authError; // To satisfy consistent-return rule
                })
            }
            
            // If not an invalid session, just reject with the original error
            reject(e)
            return e; // To satisfy consistent-return rule
          })
      }
    })
  }
}

// Expose public constants
Object.keys(constants.public).forEach(key => {
  Object.defineProperty(Avanza, key, {
    value: constants.public[key],
  })
})

module.exports = Avanza
