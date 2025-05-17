# API Updates

## Version 1.1.9 - 2025-05-18

### Added
- New `getAccountsList()` method that returns all accounts with detailed information
- New `getAccountPositions(accountId)` method to get positions for a specific account

### Changed
- Updated account overview endpoint to use the new API format
- Updated positions API to use new endpoints
- Enhanced `getPositions()` to maintain backward compatibility while using new API

## Version 1.1.8 - 2025-05-18
Avanza has updated their API endpoints. This library now uses the new _api format instead of the old _mobile format for most endpoints. This should improve reliability and compatibility with Avanza's latest API changes.

The following key endpoints have been updated:
- Account positions: `/_api/account/positions`
- Account overview: `/_api/account/{0}/overview`
- Stock information: `/_api/market-guide/stock/{0}`
- Fund information: `/_api/fund-guide/{0}`
- Chart data: `/_api/price-chart/stock/{0}`
- Transactions: `/_api/account/transactions/{0}`
- Watchlists: `/_api/usercontent/watchlist`

No changes to your code should be required as these are internal updates to the API paths.

<a name="Avanza"></a>

## Avanza ⇐ <code>EventEmitter</code>
<p>An Avanza API wrapper.</p>
<h3>Constants</h3>
<p>Some methods require certain constants as parameters. These are described below.</p>
<h4>Instrument types</h4>
<table>
<thead>
<tr>
<th style="text-align:left">Type</th>
<th style="text-align:left">Note</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left"><code>Avanza.STOCK</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.FUND</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.BOND</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.OPTION</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.FUTURE_FORWARD</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.CERTIFICATE</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.WARRANT</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.EXCHANGE_TRADED_FUND</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.INDEX</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.PREMIUM_BOND</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.SUBSCRIPTION_OPTION</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.EQUITY_LINKED_BOND</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.CONVERTIBLE</code></td>
<td style="text-align:left"></td>
</tr>
</tbody>
</table>
<h4>Periods</h4>
<table>
<thead>
<tr>
<th style="text-align:left">Period</th>
<th style="text-align:left">Note</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left"><code>Avanza.TODAY</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.ONE_WEEK</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.ONE_MONTH</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.THREE_MONTHS</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.THIS_YEAR</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.ONE_YEAR</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.FIVE_YEARS</code></td>
<td style="text-align:left"></td>
</tr>
</tbody>
</table>
<h4>Lists</h4>
<table>
<thead>
<tr>
<th style="text-align:left">List</th>
<th style="text-align:left">Note</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left"><code>Avanza.HIGHEST_RATED_FUNDS</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.LOWEST_FEE_INDEX_FUNDS</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.BEST_DEVELOPMENT_FUNDS_LAST_THREE_MONTHS</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.MOST_OWNED_FUNDS</code></td>
<td style="text-align:left"></td>
</tr>
</tbody>
</table>
<h4>Channels</h4>
<p>Note that for all channels where a <em>sequence</em> of account IDs are expected
(<code>&lt;accountId1&gt;,&lt;accountId2&gt;,...</code>), you must supply all of your account IDs,
regardless of whether or not you want data for that account.</p>
<table>
<thead>
<tr>
<th style="text-align:left">Channel</th>
<th style="text-align:left">Note</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left"><code>Avanza.QUOTES</code></td>
<td style="text-align:left">Minute-wise data containing current price, change, total volume traded etc. Expects an <strong>orderbookId</strong>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.ORDERDEPTHS</code></td>
<td style="text-align:left">Best five offers and current total volume on each side. Expects an <strong>orderbookId</strong>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.TRADES</code></td>
<td style="text-align:left">Updates whenever a new trade is made. Data contains volume, price, broker etc. Expects an <strong>orderbookId</strong>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.BROKERTRADESUMMARY</code></td>
<td style="text-align:left">Pushes data about which brokers are long/short and how big their current net volume is. Expects an <strong>orderbookId</strong>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.POSITIONS</code></td>
<td style="text-align:left">Your positions in an instrument. Expects a string of <code>&lt;orderbookId&gt;_&lt;accountId1&gt;,&lt;accountId2,&lt;accountId3&gt;,...</code>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.ORDERS</code></td>
<td style="text-align:left">Your current orders. Expects a string of <code>_&lt;accountId1&gt;,&lt;accountId2,&lt;accountId3&gt;,...</code>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.DEALS</code></td>
<td style="text-align:left">Recent trades you have made. Expects a string of <code>_&lt;accountId1&gt;,&lt;accountId2,&lt;accountId3&gt;,...</code>.</td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.ACCOUNTS</code></td>
<td style="text-align:left">N/A. Expects a string of <code>_&lt;accountId&gt;</code>.</td>
</tr>
</tbody>
</table>
<h4>Transaction Types</h4>
<table>
<thead>
<tr>
<th style="text-align:left">Transaction type</th>
<th style="text-align:left">Note</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left"><code>Avanza.OPTIONS</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.FOREX</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.DEPOSIT_WITHDRAW</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.BUY_SELL</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.DIVIDEND</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.INTEREST</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.FOREIGN_TAX</code></td>
<td style="text-align:left"></td>
</tr>
</tbody>
</table>
<h4>Order Types</h4>
<table>
<thead>
<tr>
<th style="text-align:left">Order type</th>
<th style="text-align:left">Note</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left"><code>Avanza.BUY</code></td>
<td style="text-align:left"></td>
</tr>
<tr>
<td style="text-align:left"><code>Avanza.SELL</code></td>
<td style="text-align:left"></td>
</tr>
</tbody>
</table>

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [Avanza](#Avanza) ⇐ <code>EventEmitter</code>
    * [.authenticate(credentials)](#Avanza+authenticate)
    * [.disconnect()](#Avanza+disconnect)
    * [.getPositions()](#Avanza+getPositions)
    * [.getAccountPositions(accountId)](#Avanza+getAccountPositions)
    * [.getAccountsList()](#Avanza+getAccountsList)
    * [.getOverview()](#Avanza+getOverview)
    * [.getAccountOverview(accountId)](#Avanza+getAccountOverview)
    * [.getDealsAndOrders()](#Avanza+getDealsAndOrders)
    * [.getTransactions(accountOrTransactionType, options)](#Avanza+getTransactions)
    * [.getWatchlists()](#Avanza+getWatchlists)
    * [.addToWatchlist(instrumentId, watchlistId)](#Avanza+addToWatchlist)
    * [.removeFromWatchlist(instrumentId, watchlistId)](#Avanza+removeFromWatchlist)
    * [.getInstrument(instrumentId, instrumentType)](#Avanza+getInstrument)
    * [.getOrderbook(orderbookId, instrumentType)](#Avanza+getOrderbook)
    * [.getOrderbooks(orderbookIds)](#Avanza+getOrderbooks)
    * [.getChartdata(orderbookId, period)](#Avanza+getChartdata)
    * [.getInspirationLists()](#Avanza+getInspirationLists)
    * [.getInspirationList(type)](#Avanza+getInspirationList)
    * [.subscribe(channel, ids, callback)](#Avanza+subscribe) ⇒ <code>function</code>
    * [.placeOrder(options)](#Avanza+placeOrder) ⇒ <code>Object</code>
    * [.getOrder(instrumentType, accountId, orderId)](#Avanza+getOrder)
    * [.editOrder(instrumentType, orderId, options)](#Avanza+editOrder)
    * [.deleteOrder(options)](#Avanza+deleteOrder)
    * [.search(searchQuery, [type], [limit])](#Avanza+search)
    * [.call([method], [path], [data])](#Avanza+call) ⇒ <code>Promise</code>

<a name="Avanza+authenticate"></a>

### avanza.authenticate(credentials)
<p>Authenticate the client.</p>
<p>If second factor authentication is needed, either the one time code can be provided in <code>totp</code>, or the secret to
generate codes can be provided in <code>totpSecret</code>.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type |
| --- | --- |
| credentials | <code>Object</code> | 
| credentials.username | <code>String</code> | 
| credentials.password | <code>String</code> | 
| credentials.totp | <code>String</code> | 
| credentials.totpSecret | <code>String</code> | 

<a name="Avanza+disconnect"></a>

### avanza.disconnect()
<p>Disconnects by simulating a client that just goes away.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
<a name="Avanza+getPositions"></a>

### avanza.getPositions()
<p>Get all positions held by this user across all accounts.</p>
<p>This method will first get all accounts, then fetch positions for each account
and combine them into a single response. For backward compatibility, it transforms
the new API format into the old format while preserving the raw data.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Promise resolving to positions data

<a name="Avanza+getAccountPositions"></a>

### avanza.getAccountPositions(accountId)
<p>Get all positions held by this user for a specific account.</p>
<p>Returns detailed position data in the new API format including:</p>
<ul>
<li>Positions with orderbooks (stocks, funds, etc.)</li>
<li>Positions without orderbooks</li>
<li>Cash positions</li>
</ul>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Promise resolving to positions data

| Param | Type | Description |
| --- | --- | --- |
| accountId | <code>String</code> | <p>The URL parameter ID for the account</p> |
<a name="Avanza+getAccountsList"></a>

### avanza.getAccountsList()
<p>Get list of all accounts.</p>
<p>Returns detailed information about all accounts including:</p>
<ul>
<li>Account ID and name</li>
<li>Account type</li>
<li>Clearing account number</li>
<li>URL parameter ID (for direct linking)</li>
<li>Account settings</li>
</ul>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
**Returns**: <code>Promise.&lt;Array&gt;</code> - Promise resolving to an array of account objects

<a name="Avanza+getOverview"></a>

### avanza.getOverview()
<p>Get an overview of the users holdings at Avanza Bank.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
<a name="Avanza+getAccountOverview"></a>

### avanza.getAccountOverview(accountId)
<p>Get an overview of the users holdings for a specific account at Avanza Bank.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| accountId | <code>String</code> | <p>A valid account ID.</p> |

<a name="Avanza+getDealsAndOrders"></a>

### avanza.getDealsAndOrders()
<p>Get recent deals and orders.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
<a name="Avanza+getTransactions"></a>

### avanza.getTransactions(accountOrTransactionType, options)
<p>Get all transactions of an account.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| accountOrTransactionType | <code>String</code> | <p>A valid account ID or a <a href="#transaction-type">Transaction Type</a>.</p> |
| options | <code>Object</code> | <p>Configuring which transactions to fetch.</p> |
| [options.from] | <code>String</code> | <p>On the form YYYY-MM-DD.</p> |
| [options.to] | <code>String</code> | <p>On the form YYYY-MM-DD.</p> |
| [options.maxAmount] | <code>Number</code> | <p>Only fetch transactions of at most this value.</p> |
| [options.minAmount] | <code>Number</code> | <p>Only fetch transactions of at least this value.</p> |
| [options.orderbookId] | <code>String</code> \| <code>Array</code> | <p>Only fetch transactions involving this/these orderbooks.</p> |

<a name="Avanza+getWatchlists"></a>

### avanza.getWatchlists()
<p>Get all watchlists created by this user. Note that the second table was
created from a specific watchlist, and so the response from the API will be
different for you.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
<a name="Avanza+addToWatchlist"></a>

### avanza.addToWatchlist(instrumentId, watchlistId)
<p>Add an instrument to the watchlist.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| instrumentId | <code>String</code> | <p>The ID of the instrument to add.</p> |
| watchlistId | <code>String</code> | <p>The ID of the watchlist to add the instrument to.</p> |

<a name="Avanza+removeFromWatchlist"></a>

### avanza.removeFromWatchlist(instrumentId, watchlistId)
<p>Remove an instrument from the watchlist.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| instrumentId | <code>String</code> | <p>The ID of the instrument to remove.</p> |
| watchlistId | <code>String</code> | <p>The ID of the watchlist to remove the instrument from.</p> |

<a name="Avanza+getInstrument"></a>

### avanza.getInstrument(instrumentId, instrumentType)
<p>Get instrument information.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| instrumentId | <code>String</code> | <p>Likely the same as the instrumentId.</p> |
| instrumentType | <code>String</code> | <p>The type of the instrument. See <a href="#instrument-types">Instrument Types</a>.</p> |

<a name="Avanza+getOrderbook"></a>

### avanza.getOrderbook(orderbookId, instrumentType)
<p>Get orderbook information.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| orderbookId | <code>String</code> | <p>Likely the same as the instrumentId.</p> |
| instrumentType | <code>String</code> | <p>The type of the instrument. See <a href="#instrument-types">Instrument Types</a>.</p> |

<a name="Avanza+getOrderbooks"></a>

### avanza.getOrderbooks(orderbookIds)
<p>Get information about multiple orderbooks.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| orderbookIds | <code>Array</code> | <p>A list of orderbook IDs.</p> |

<a name="Avanza+getChartdata"></a>

### avanza.getChartdata(orderbookId, period)
<p>Get an array of prices over a period of time.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| orderbookId | <code>String</code> | <p>The orderbook to fetch price data about.</p> |
| period | <code>Period</code> | <p>The period from which to fetch data. See <a href="#periods">Periods</a>.</p> |

<a name="Avanza+getInspirationLists"></a>

### avanza.getInspirationLists()
<p>List all inspiration lists.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
<a name="Avanza+getInspirationList"></a>

### avanza.getInspirationList(type)
<p>Get information about a single inspiration list.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | <p>List type. See <a href="#lists">Lists</a></p> |

<a name="Avanza+subscribe"></a>

### avanza.subscribe(channel, ids, callback) ⇒ <code>function</code>
<p>Subscribe to real-time data.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
**Returns**: <code>function</code> - <p>Call to unsubscribe.</p>  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>String</code> | <p>The channel on which to listen. See <a href="#channels">Channels</a>.</p> |
| ids | <code>String</code> \| <code>Array.&lt;String&gt;</code> | <p>One or many IDs to subscribe to.</p> |
| callback | <code>function</code> | <p>Function to call whenever the subscription receives a new message</p> |

<a name="Avanza+placeOrder"></a>

### avanza.placeOrder(options) ⇒ <code>Object</code>
<p>Place a limit order.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  
**Returns**: <code>Object</code> - <p>Properties are <code>messages</code>, <code>requestId</code>, <code>orderRequestStatus</code>, <code>orderId</code>.</p>  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | <p>Order options.</p> |
| options.accountId | <code>String</code> | <p>ID of the account to trade on.</p> |
| options.orderbookId | <code>String</code> | <p>ID of the instrument to trade.</p> |
| options.side | <code>String</code> | <p>One of &quot;BUY&quot; or &quot;SELL&quot;.</p> |
| options.price | <code>Number</code> | <p>The price limit of the order.</p> |
| options.validUntil | <code>String</code> | <p>A date on the form YYYY-MM-DD. Cancels the order if this date is passed.</p> |
| options.volume | <code>Number</code> | <p>How many securities to order.</p> |

<a name="Avanza+getOrder"></a>

### avanza.getOrder(instrumentType, accountId, orderId)
<p>Get information about an order.</p>
<p>It is quite hard to automatically generate tables of what this endpoint
returns since orders are merely temporary entities.</p>
<p>The returned object however looks very much like that from
<a href="#getorderbook">getOrderbook()</a> with an extra property <code>order</code> which
contains information you already have (such as order price or volume).</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| instrumentType | <code>String</code> | <p>Instrument type of the pertaining instrument. See <a href="#instrument-types">Instrument Types</a>.</p> |
| accountId | <code>String</code> | <p>ID of the account which this order was placed on.</p> |
| orderId | <code>String</code> | <p>ID of the order.</p> |

<a name="Avanza+editOrder"></a>

### avanza.editOrder(instrumentType, orderId, options)
<p>Edit an order.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| instrumentType | <code>String</code> | <p>Instrument type of the pertaining instrument. See <a href="#instrument-types">Instrument Types</a>.</p> |
| orderId | <code>String</code> | <p>Order ID received when placing the order.</p> |
| options | <code>Object</code> | <p>Order options. See <a href="#placeorder">placeOrder()</a>.</p> |

<a name="Avanza+deleteOrder"></a>

### avanza.deleteOrder(options)
<p>Delete and cancel an order.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | <p>Order options.</p> |
| options.accountId | <code>String</code> | <p>ID of the account on which this order was placed.</p> |
| options.orderId | <code>String</code> | <p>Order ID received when the order was placed.</p> |

<a name="Avanza+search"></a>

### avanza.search(searchQuery, [type], [limit])
<p>Free text search for an instrument.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| searchQuery | <code>String</code> |  | <p>Search query.</p> |
| [type] | <code>String</code> |  | <p>An instrument type.</p> |
| [limit] | <code>Number</code> | <code>100</code> | <p>Maximum number of results to return.</p> |

<a name="Avanza+call"></a>

### avanza.call([method], [path], [data]) ⇒ <code>Promise</code>
<p>Make a call to the API. Note that this method will filter dangling question
marks from <code>path</code>.</p>

**Kind**: instance method of [<code>Avanza</code>](#Avanza)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [method] | <code>String</code> | <code>&#x27;GET&#x27;</code> | <p>HTTP method to use.</p> |
| [path] | <code>String</code> | <code>&#x27;&#x27;</code> | <p>The URL to send the request to.</p> |
| [data] | <code>Object</code> | <code>{}</code> | <p>JSON data to send with the request.</p> |

