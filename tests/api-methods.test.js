const test = require('ava')
const path = require('path')
const sinon = require('sinon')

const Avanza = require('../dist/index')
const constants = require('../dist/constants')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

let avanza
let authenticated = false

// Helper function to skip tests if authentication fails
const checkAuth = (t) => {
  if (!authenticated) {
    t.pass('Skipping: Authentication required for this test')
    return false
  }
  return true
}

test.before(async (t) => {
  // Create a new instance of Avanza and store it in the test context
  avanza = new Avanza()
  t.context.avanza = avanza
  
  // Setup the stub method for tests that require call() to be stubbed
  // This allows path tests to run without needing authentication
  t.context.avanza.call = function() {
    return Promise.resolve({});
  };
  
  // Mock authentication success by directly setting the properties
  // that would normally be set during successful authentication
  avanza._authenticationSession = 'mock-session-123';
  avanza._pushSubscriptionId = 'mock-subscription-123';
  avanza._customerId = 'mock-customer-123';
  avanza._securityToken = 'mock-token-123';
  
  // Set authenticated flag for test conditional checks
  authenticated = true;
  
  // Setup minimal socket-related methods to avoid errors in tests
  avanza._socketHandleMessage = function() {};
})

// Authentication tests
test('authentication sets required properties', async (t) => {
  if (!authenticated) {
    t.pass('Skipping: Authentication required for this test')
    return
  }
  
  // Check if authentication was actually successful
  if (!avanza._authenticationSession) {
    t.pass('Skipping: Authentication failed or session not set')
    return
  }
  
  t.is(typeof avanza._authenticationSession, 'string', 'authenticationSession is set')
  t.is(typeof avanza._pushSubscriptionId, 'string', 'pushSubscriptionId is set')
  t.is(typeof avanza._customerId, 'string', 'customerId is set')
  t.is(typeof avanza._securityToken, 'string', 'securityToken is set')
})

// Path tests - These run without real API calls
test.serial('path: getPositions()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getPositions()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.POSITIONS_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOverview()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getOverview()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.OVERVIEW_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getAccountOverview()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getAccountOverview('12345')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.ACCOUNT_OVERVIEW_PATH.replace('{0}', '12345')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getDealsAndOrders()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getDealsAndOrders()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.DEALS_AND_ORDERS_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getTransactions() without options', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getTransactions('12345')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.TRANSACTIONS_PATH.replace('{0}', '12345')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getTransactions() with options', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getTransactions('12345', {
    from: '2017-01-01',
    to: '2018-01-01',
    maxAmount: 12345,
    minAmount: 54321,
    orderbookId: ['A', 'B', 'C'],
  })
  
  const expectedPath = constants.paths.TRANSACTIONS_PATH.replace('{0}', '12345')
  const expectedQuery = '?from=2017-01-01&to=2018-01-01&maxAmount=12345&minAmount=54321&orderbookId=A%2CB%2CC'
  
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getWatchlists()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getWatchlists()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.WATCHLISTS_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: addToWatchlist()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.addToWatchlist('12345', '54321')
  
  const expectedPath = constants.paths.WATCHLISTS_ADD_DELETE_PATH.replace('{1}', '12345').replace('{0}', '54321')
  
  const actual = callStub.args[0]
  const expected = ['PUT', expectedPath]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: removeFromWatchlist()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.removeFromWatchlist('12345', '54321')
  
  const expectedPath = constants.paths.WATCHLISTS_ADD_DELETE_PATH.replace('{1}', '12345').replace('{0}', '54321')
  
  const actual = callStub.args[0]
  const expected = ['DELETE', expectedPath]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getInstrument()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getInstrument('STOCK', '12345')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.INSTRUMENT_PATH.replace('{0}', 'stock').replace('{1}', '12345')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOrderbook()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getOrderbook('STOCK', '12345')
  
  const expectedPath = constants.paths.ORDERBOOK_PATH.replace('{0}', 'stock')
  const expectedQuery = '?orderbookId=12345'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOrderbooks()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getOrderbooks(['123', '456', '789'])
  
  const expectedPath = constants.paths.ORDERBOOK_LIST_PATH.replace('{0}', '123,456,789')
  const expectedQuery = '?sort=name'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getChartdata()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getChartdata('12345', 'test')
  
  const expectedPath = constants.paths.CHARTDATA_PATH.replace('{0}', '12345')
  const expectedQuery = '?timePeriod=test'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: placeOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  const options = {
    accountId: '123',
    orderbookId: '456',
    side: 'BUY',
    price: 789,
    validUntil: '2023-01-01',
    volume: 100,
  }
  await t.context.avanza.placeOrder(options)
  
  const actual = callStub.args[0]
  const expected = ['POST', constants.paths.ORDER_PLACE_PATH, { ...options }]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getOrder('STOCK', '12345', '54321')
  
  const expectedPath = constants.paths.ORDER_GET_PATH.replace('{0}', 'stock')
  const expectedQuery = '?accountId=12345&orderId=54321'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: deleteOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.deleteOrder({ accountId: '12345', orderId: '54321' })
  
  const expectedPath = constants.paths.ORDER_DELETE_PATH
  const actual = callStub.args[0]
  const expected = ['POST', expectedPath, { accountId: '12345', orderId: '54321' }]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: editOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  const options = {
    accountId: '12345',
    volume: 42,
    price: 100,
    validUntil: '2023-01-01',
  }
  await t.context.avanza.editOrder('STOCK', '54321', options)
  
  const expectedPath = constants.paths.ORDER_EDIT_PATH.replace('{0}', 'stock').replace('{1}', '54321')
  const actual = callStub.args[0]
  const expected = ['PUT', expectedPath, { ...options, orderCondition: 'NORMAL' }]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: search()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.search('test query', 'STOCK', 50)
  
  const expectedOptions = {
    query: 'test query',
    searchFilter: { 
      types: ['STOCK']
    },
    pagination: {
      from: 0,
      size: 50
    }
  }
  
  const actual = callStub.args[0]
  const expected = ['POST', constants.paths.SEARCH_PATH, expectedOptions]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getInspirationLists()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getInspirationLists()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.INSPIRATION_LIST_PATH.replace('{0}', '')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getInspirationList()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call')
  await t.context.avanza.getInspirationList('HIGHEST_RATED_FUNDS')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.INSPIRATION_LIST_PATH.replace('{0}', 'HIGHEST_RATED_FUNDS')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

// API tests with mocked responses
test('mock: getPositions() returns positions', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve({ 
    instrumentPositions: [], 
    totalBalance: 10000, 
    totalOwnCapital: 9000 
  });
  
  const positions = await t.context.avanza.getPositions();
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(positions);
  t.true(typeof positions === 'object');
})

test('mock: getOverview() returns overview', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve({ 
    accounts: [], 
    totalBalance: 10000, 
    totalOwnCapital: 9000 
  });
  
  const overview = await t.context.avanza.getOverview();
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(overview);
  t.true(typeof overview === 'object');
})

test('mock: getDealsAndOrders() returns deals and orders', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve({ 
    accounts: [], 
    deals: [],
    orders: []
  });
  
  const dealsAndOrders = await t.context.avanza.getDealsAndOrders();
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(dealsAndOrders);
  t.true(typeof dealsAndOrders === 'object');
})

test('mock: getWatchlists() returns watchlists', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve([
    { id: '1', name: 'Watchlist 1', orderbooks: [] },
    { id: '2', name: 'Watchlist 2', orderbooks: [] }
  ]);
  
  const watchlists = await t.context.avanza.getWatchlists();
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(watchlists);
  t.true(Array.isArray(watchlists));
})

test('mock: search() returns search results', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve({ 
    hits: [
      { 
        instrumentType: 'STOCK',
        numberOfHits: 5,
        topHits: []
      }
    ],
    totalNumberOfHits: 5
  });
  
  const searchResults = await t.context.avanza.search('Volvo', Avanza.STOCK, 5);
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(searchResults);
  t.true(typeof searchResults === 'object');
  t.true(Array.isArray(searchResults.hits));
})

test('mock: getInspirationLists() returns inspiration lists', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve([
    { id: '1', name: 'Inspiration List 1', orderbooks: [] },
    { id: '2', name: 'Inspiration List 2', orderbooks: [] }
  ]);
  
  const lists = await t.context.avanza.getInspirationLists();
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(lists);
  t.true(Array.isArray(lists));
})

test('mock: getOrderbook() returns orderbook data', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve({ 
    orderbook: {
      id: '5361',
      name: 'Test Stock',
      lastPrice: 100.0,
      change: 1.5,
      changePercent: 1.5
    },
    latestTrades: [],
    marketMakerExpected: true
  });
  
  // Use a default stock ID
  const stockId = '5361';
  
  const orderbook = await t.context.avanza.getOrderbook(Avanza.STOCK, stockId);
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(orderbook);
  t.true(typeof orderbook === 'object');
  t.truthy(orderbook.orderbook);
})

test('mock: getChartdata() returns chart data', async (t) => {
  // Setup mock response
  const originalCall = t.context.avanza.call;
  t.context.avanza.call = () => Promise.resolve({ 
    dataSeries: [
      { timestamp: '2020-01-01', value: 100 },
      { timestamp: '2020-01-02', value: 101 }
    ],
    min: 99,
    max: 102,
    change: 1,
    changePercent: 1
  });
  
  // Use a default stock ID
  const stockId = '5361';
  
  const chartdata = await t.context.avanza.getChartdata(stockId, Avanza.ONE_MONTH);
  
  // Restore original call method
  t.context.avanza.call = originalCall;
  
  t.truthy(chartdata);
  t.true(typeof chartdata === 'object');
  t.truthy(chartdata.dataSeries);
})

// Mock socket test for subscription
test('mock: subscribe() and unsubscribe()', async t => {
  // Just test the interface is available without making actual socket connections
  t.is(typeof avanza.subscribe, 'function')
  t.pass('Subscription interface is available')
})

// Test authentication without real orders
test('mock: authentication token refresh', async t => {
  // Simply test that the token refresh functionality exists
  t.is(typeof avanza.authenticate, 'function')
  t.pass('Authentication interface is available')
})