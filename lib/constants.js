/* eslint-disable no-multi-spaces */

const constants = {
  paths: {},
  public: {},
}

/**
 * Paths
 */
constants.paths = {}
constants.paths.POSITIONS_PATH = '/_api/account/positions' // Updated from _mobile to _api
constants.paths.OVERVIEW_PATH = '/_api/trading-critical/rest/accounts'
constants.paths.ACCOUNT_OVERVIEW_PATH = '/_api/account-overview/overview/account/{0}' // Updated to match new API format
constants.paths.DEALS_AND_ORDERS_PATH = '/_api/account/dealsandorders' // Updated from _mobile to _api
constants.paths.WATCHLISTS_PATH = '/_api/usercontent/watchlist' // Updated from _mobile to _api
constants.paths.WATCHLISTS_ADD_DELETE_PATH = '/_api/usercontent/watchlist/{0}/orderbooks/{1}'
constants.paths.STOCK_PATH = '/_api/market-guide/stock/{0}' // Updated from _mobile/market/stock to _api/market-guide/stock
constants.paths.FUND_PATH = '/_api/fund-guide/{0}' // Updated from _mobile/market/fund to _api/fund-guide
constants.paths.CERTIFICATE_PATH = '/_api/market-guide/certificate/{0}' // Updated from _mobile to _api
constants.paths.INSTRUMENT_PATH = '/_api/market-guide/{0}/{1}' // Updated from _mobile to _api
constants.paths.ORDERBOOK_PATH = '/_api/order/{0}' // Updated from _mobile to _api
constants.paths.ORDERBOOK_LIST_PATH = '/_api/market-guide/orderbooklist/{0}' // Updated from _mobile to _api
constants.paths.CHARTDATA_PATH = '/_api/price-chart/stock/{0}' // Updated from _mobile/chart/orderbook to _api/price-chart/stock
constants.paths.ORDER_PLACE_PATH = '/_api/trading-critical/rest/order/new'
constants.paths.ORDER_DELETE_PATH = '/_api/trading-critical/rest/order/delete'
constants.paths.ORDER_EDIT_PATH = '/_api/order/{0}/{1}'
constants.paths.ORDER_GET_PATH = '/_api/order/{0}' // Updated from _mobile to _api
constants.paths.SEARCH_PATH = '/_api/search/filtered-search'
constants.paths.AUTHENTICATION_PATH = '/_api/authentication/sessions/usercredentials'
constants.paths.TOTP_PATH = '/_api/authentication/sessions/totp'
constants.paths.INSPIRATION_LIST_PATH = '/_api/marketing/inspirationlist/{0}' // Updated from _mobile to _api
constants.paths.TRANSACTIONS_PATH = '/_api/account/transactions/{0}' // Updated from _mobile to _api

/**
 * Search
 */
constants.public.STOCK = 'stock'
constants.public.FUND = 'fund'
constants.public.BOND = 'bond'
constants.public.OPTION = 'option'
constants.public.FUTURE_FORWARD = 'future_forward'
constants.public.CERTIFICATE = 'certificate'
constants.public.WARRANT = 'warrant'
constants.public.ETF = 'exchange_traded_fund'
constants.public.INDEX = 'index'
constants.public.PREMIUM_BOND = 'premium_bond'
constants.public.SUBSCRIPTION_OPTION = 'subscription_option'
constants.public.EQUITY_LINKED_BOND = 'equity_linked_bond'
constants.public.CONVERTIBLE = 'convertible'

/**
 * Chartdata
 */
constants.public.TODAY = 'TODAY'
constants.public.ONE_MONTH = 'ONE_MONTH'
constants.public.THREE_MONTHS = 'THREE_MONTHS'
constants.public.ONE_WEEK = 'ONE_WEEK'
constants.public.THIS_YEAR = 'THIS_YEAR'
constants.public.ONE_YEAR = 'ONE_YEAR'
constants.public.FIVE_YEARS = 'FIVE_YEARS'

/**
 * Marketing
 */
constants.public.HIGHEST_RATED_FUNDS = 'HIGHEST_RATED_FUNDS'
constants.public.LOWEST_FEE_INDEX_FUNDS = 'LOWEST_FEE_INDEX_FUNDS'
constants.public.BEST_DEVELOPMENT_FUNDS_LAST_THREE_MONTHS = 'BEST_DEVELOPMENT_FUNDS_LAST_THREE_MONTHS'
constants.public.MOST_OWNED_FUNDS = 'MOST_OWNED_FUNDS'

/**
 * Transactions
 */
constants.public.OPTIONS = 'options'
constants.public.FOREX = 'forex'
constants.public.DEPOSIT_WITHDRAW = 'deposit-withdraw'
constants.public.BUY_SELL = 'buy-sell'
constants.public.DIVIDEND = 'dividend'
constants.public.INTEREST = 'interest'
constants.public.FOREIGN_TAX = 'foreign-tax'

/**
 * Channels
 */
constants.public.ACCOUNTS = 'accounts'
constants.public.QUOTES = 'quotes'
constants.public.ORDERDEPTHS = 'orderdepths'
constants.public.TRADES = 'trades'
constants.public.BROKERTRADESUMMARY = 'brokertradesummary'
constants.public.POSITIONS = 'positions'
constants.public.ORDERS = 'orders'
constants.public.DEALS = 'deals'

/**
 * Order types
 */
constants.public.BUY = 'BUY'
constants.public.SELL = 'SELL'

module.exports = constants
