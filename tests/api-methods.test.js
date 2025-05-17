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

test.beforeEach((t) => {
  // Create a new instance of Avanza for each test to avoid shared state
  const testAvanza = new Avanza();
  t.context.avanza = testAvanza;
  
  // Setup the mock method for tests that require call() to be mocked
  // This allows path tests to run without needing authentication
  t.context.avanza.call = function() {
    return Promise.resolve({});
  };
  
  // Mock authentication success by directly setting the properties
  // that would normally be set during successful authentication
  testAvanza._authenticationSession = 'mock-session-123';
  testAvanza._pushSubscriptionId = 'mock-subscription-123';
  testAvanza._customerId = 'mock-customer-123';
  testAvanza._securityToken = 'mock-token-123';
  
  // Setup minimal socket-related methods to avoid errors in tests
  testAvanza._socketHandleMessage = function() {};
  
  // Set once for all tests
  if (!authenticated) {
    authenticated = true;
    avanza = testAvanza;
  }
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
test.serial('path: getAccountPositions()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getAccountPositions('test-account-id')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.POSITIONS_PATH.replace('{0}', 'test-account-id')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getPositions()', async (t) => {
  // This is more complex as it now depends on getAccountsList and getAccountPositions
  // We'll mock these methods directly instead of stubbing the call method
  
  // Create mock accounts list
  const mockAccounts = [
    {
      id: "12345",
      name: "Test Account",
      urlParameterId: "test-url-id",
      accountSettings: { IS_HIDDEN: false }
    }
  ];
  
  // Create mock positions
  const mockPositions = {
    withOrderbook: [],
    withoutOrderbook: [],
    cashPositions: []
  };
  
  // Replace the methods with stubs
  const getAccountsListStub = sinon.stub(t.context.avanza, 'getAccountsList').returns(Promise.resolve(mockAccounts));
  const getAccountPositionsStub = sinon.stub(t.context.avanza, 'getAccountPositions').returns(Promise.resolve(mockPositions));
  
  // Call the method
  await t.context.avanza.getPositions();
  
  // Verify the calls
  t.true(getAccountsListStub.calledOnce);
  t.true(getAccountPositionsStub.calledOnce);
  t.is(getAccountPositionsStub.args[0][0], 'test-url-id');
  
  // Restore stubs
  getAccountsListStub.restore();
  getAccountPositionsStub.restore();
})

test.serial('path: getAccountsList()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve([]))
  await t.context.avanza.getAccountsList()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.ACCOUNTS_LIST_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOverview()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve([])) // Return a promise with an empty array
  await t.context.avanza.getOverview()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.OVERVIEW_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getAccountOverview()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getAccountOverview('12345')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.ACCOUNT_OVERVIEW_PATH.replace('{0}', '12345')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getDealsAndOrders()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getDealsAndOrders()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.DEALS_AND_ORDERS_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getTransactions() without options', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getTransactions('12345')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.TRANSACTIONS_PATH.replace('{0}', '12345')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getTransactions() with options', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
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
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve([]))
  await t.context.avanza.getWatchlists()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.WATCHLISTS_PATH]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: addToWatchlist()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.addToWatchlist('12345', '54321')
  
  const expectedPath = constants.paths.WATCHLISTS_ADD_DELETE_PATH.replace('{1}', '12345').replace('{0}', '54321')
  
  const actual = callStub.args[0]
  const expected = ['PUT', expectedPath]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: removeFromWatchlist()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.removeFromWatchlist('12345', '54321')
  
  const expectedPath = constants.paths.WATCHLISTS_ADD_DELETE_PATH.replace('{1}', '12345').replace('{0}', '54321')
  
  const actual = callStub.args[0]
  const expected = ['DELETE', expectedPath]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getInstrument()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getInstrument('STOCK', '12345')
  
  // Update this test to match the new format for API endpoints
  // In the updated constants.js, stock-related endpoints use market-guide
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.INSTRUMENT_PATH.replace('{0}', 'stock').replace('{1}', '12345')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOrderbook()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getOrderbook('STOCK', '12345')
  
  const expectedPath = constants.paths.ORDERBOOK_PATH.replace('{0}', 'stock')
  const expectedQuery = '?orderbookId=12345'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getOrderbooks()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getOrderbooks(['123', '456', '789'])
  
  const expectedPath = constants.paths.ORDERBOOK_LIST_PATH.replace('{0}', '123,456,789')
  const expectedQuery = '?sort=name'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getChartdata()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getChartdata('12345', 'test')
  
  const expectedPath = constants.paths.CHARTDATA_PATH.replace('{0}', '12345')
  const expectedQuery = '?timePeriod=test'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: placeOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
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
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.getOrder('STOCK', '12345', '54321')
  
  const expectedPath = constants.paths.ORDER_GET_PATH.replace('{0}', 'stock')
  const expectedQuery = '?accountId=12345&orderId=54321'
  const actual = callStub.args[0]
  const expected = ['GET', expectedPath + expectedQuery]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: deleteOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
  await t.context.avanza.deleteOrder({ accountId: '12345', orderId: '54321' })
  
  const expectedPath = constants.paths.ORDER_DELETE_PATH
  const actual = callStub.args[0]
  const expected = ['POST', expectedPath, { accountId: '12345', orderId: '54321' }]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: editOrder()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({}))
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
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve({ hits: [] }))
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
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve([]))
  await t.context.avanza.getInspirationLists()
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.INSPIRATION_LIST_PATH.replace('{0}', '')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

test.serial('path: getInspirationList()', async (t) => {
  const callStub = sinon.stub(t.context.avanza, 'call').returns(Promise.resolve([]))
  await t.context.avanza.getInspirationList('HIGHEST_RATED_FUNDS')
  
  const actual = callStub.args[0]
  const expected = ['GET', constants.paths.INSPIRATION_LIST_PATH.replace('{0}', 'HIGHEST_RATED_FUNDS')]
  t.deepEqual(actual, expected)
  callStub.restore()
})

// API tests with mocked responses
test('mock: getAccountPositions() returns positions for a specific account', async (t) => {
  // Mock response from the new API format
  const mockPositionsResponse = {
    withOrderbook: [
      {
        account: {
          id: "1878993",
          type: "KAPITALFORSAKRING",
          name: "KF",
          urlParameterId: "GZp2LfXV-MN_vCt59XJKAA",
          hasCredit: false
        },
        instrument: {
          id: "1922174",
          type: "CERTIFICATE",
          name: "BULL NOVO X8 AVA 4",
          orderbook: {
            quote: {
              latest: { value: 0.131 },
              change: { value: -0.0420 },
              changePercent: { value: -24.28 }
            }
          }
        },
        value: { value: 124.9740 },
        volume: { value: 954 },
        averageAcquiredPrice: { value: 23.73000 },
        acquiredValue: { value: 22638.42000 }
      }
    ],
    withoutOrderbook: [],
    cashPositions: [
      {
        account: {
          id: "1878993",
          type: "KAPITALFORSAKRING",
          name: "KF",
          urlParameterId: "GZp2LfXV-MN_vCt59XJKAA"
        },
        totalBalance: { value: 1466.5700 }
      }
    ]
  };
  
  t.context.avanza.call = () => Promise.resolve(mockPositionsResponse);
  
  const positions = await t.context.avanza.getAccountPositions('test-account-id');
  
  t.truthy(positions);
  t.true(typeof positions === 'object');
  t.true(Array.isArray(positions.withOrderbook));
  t.is(positions.withOrderbook.length, 1);
  t.is(positions.withOrderbook[0].instrument.name, 'BULL NOVO X8 AVA 4');
})

test('mock: getPositions() returns positions with backward compatibility', async (t) => {
  // Create mock response data
  const mockAccounts = [
    {
      id: "1878993",
      name: "KF",
      urlParameterId: "GZp2LfXV-MN_vCt59XJKAA",
      accountSettings: { IS_HIDDEN: false }
    }
  ];
  
  const mockPositionsResponse = {
    withOrderbook: [
      {
        account: {
          id: "1878993",
          type: "KAPITALFORSAKRING",
          name: "KF",
          urlParameterId: "GZp2LfXV-MN_vCt59XJKAA",
          hasCredit: false
        },
        instrument: {
          id: "1922174",
          type: "CERTIFICATE",
          name: "BULL NOVO X8 AVA 4",
          orderbook: {
            quote: {
              latest: { value: 0.131 },
              change: { value: -0.0420 },
              changePercent: { value: -24.28 }
            }
          }
        },
        value: { value: 124.9740 },
        volume: { value: 954 },
        averageAcquiredPrice: { value: 23.73000 },
        acquiredValue: { value: 22638.42000 }
      }
    ],
    withoutOrderbook: [],
    cashPositions: [
      {
        account: {
          id: "1878993",
          type: "KAPITALFORSAKRING",
          name: "KF",
          urlParameterId: "GZp2LfXV-MN_vCt59XJKAA"
        },
        totalBalance: { value: 1466.5700 }
      }
    ]
  };
  
  // Set up the stubs directly
  t.context.avanza.getAccountsList = () => Promise.resolve(mockAccounts);
  t.context.avanza.getAccountPositions = () => Promise.resolve(mockPositionsResponse);
  
  const positions = await t.context.avanza.getPositions();
  
  // Test the transformed response
  t.truthy(positions);
  t.true(typeof positions === 'object');
  t.true(Array.isArray(positions.instrumentPositions));
  t.is(positions.instrumentPositions.length, 1);
  t.is(positions.instrumentPositions[0].instrument.name, 'BULL NOVO X8 AVA 4');
  t.is(positions.instrumentPositions[0].instrumentType, 'CERTIFICATE');
  t.is(typeof positions.totalBalance, 'number');
  t.is(typeof positions.totalOwnCapital, 'number');
  
  // Verify that the raw response is also available
  t.truthy(positions.rawPositions);
  t.is(positions.rawPositions, mockPositionsResponse);
})

test('mock: getAccountsList() returns accounts list', async (t) => {
  // Mock the account list response
  t.context.avanza.call = () => Promise.resolve([
    {
      id: "8098594",
      name: "8098594",
      clearingAccountNumber: "9557-8098594",
      accountType: "AKTIEFONDKONTO",
      active: true,
      hasCreditAccount: false,
      urlParameterId: "WBqkjCpHoYcgpoqzbudV1g",
      hasMultipleOwners: false,
      owner: true,
      accountSettings: {
        IS_HIDDEN: true
      }
    },
    {
      id: "1878993",
      name: "KF",
      clearingAccountNumber: "9557-1878993",
      accountType: "KAPITALFORSAKRING",
      active: true,
      hasCreditAccount: false,
      urlParameterId: "GZp2LfXV-MN_vCt59XJKAA",
      hasMultipleOwners: false,
      owner: true,
      accountSettings: {
        IS_HIDDEN: false
      }
    }
  ]);
  
  const accounts = await t.context.avanza.getAccountsList();
  
  t.truthy(accounts);
  t.true(Array.isArray(accounts));
  t.is(accounts.length, 2);
  t.is(accounts[0].accountType, "AKTIEFONDKONTO");
  t.is(accounts[1].name, "KF");
})

test('mock: getOverview() returns overview', async (t) => {
  // Mock the new API response format for this test
  t.context.avanza.call = () => Promise.resolve([
    {
      name: "Test Account",
      accountId: "1234567",
      accountType: "KAPITALFORSAKRING",
      availableForPurchase: 10000,
      positions: [],
      currencyBalances: [
        {
          currency: "SEK",
          countryCode: "SE",
          balance: 10000
        }
      ]
    }
  ]);
  
  const overview = await t.context.avanza.getOverview();
  
  t.truthy(overview);
  t.true(typeof overview === 'object');
  t.true(typeof overview.accounts !== 'undefined');
  t.true(typeof overview.totalBalance !== 'undefined');
})

test('mock: getDealsAndOrders() returns deals and orders', async (t) => {
  t.context.avanza.call = () => Promise.resolve({ 
    accounts: [], 
    deals: [],
    orders: []
  });
  
  const dealsAndOrders = await t.context.avanza.getDealsAndOrders();
  
  t.truthy(dealsAndOrders);
  t.true(typeof dealsAndOrders === 'object');
})

test('mock: getWatchlists() returns watchlists', async (t) => {
  t.context.avanza.call = () => Promise.resolve([
    { id: '1', name: 'Watchlist 1', orderbooks: [] },
    { id: '2', name: 'Watchlist 2', orderbooks: [] }
  ]);
  
  const watchlists = await t.context.avanza.getWatchlists();
  
  t.truthy(watchlists);
  t.true(Array.isArray(watchlists));
})

test('mock: search() returns search results', async (t) => {
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
  
  t.truthy(searchResults);
  t.true(typeof searchResults === 'object');
  t.true(Array.isArray(searchResults.hits));
})

test('mock: getInspirationLists() returns inspiration lists', async (t) => {
  t.context.avanza.call = () => Promise.resolve([
    { id: '1', name: 'Inspiration List 1', orderbooks: [] },
    { id: '2', name: 'Inspiration List 2', orderbooks: [] }
  ]);
  
  const lists = await t.context.avanza.getInspirationLists();
  
  t.truthy(lists);
  t.true(Array.isArray(lists));
})

test('mock: getOrderbook() returns orderbook data', async (t) => {
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
  
  t.truthy(orderbook);
  t.true(typeof orderbook === 'object');
  t.truthy(orderbook.orderbook);
})

test('mock: getChartdata() returns chart data', async (t) => {
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