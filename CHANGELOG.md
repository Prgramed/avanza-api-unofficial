# Changelog

All notable changes to this project will be documented in this file.

## [1.1.11] - 2025-05-18

### Changed
- Cookie management and minor bug fixes

## [1.1.10] - 2025-05-18

### Changed
- New `getAccountsList()` method that returns all accounts with detailed information
- Updated account overview endpoint to use the new API format
- fixed getPositions to use the new API method

## [1.1.9] - 2025-05-18

### Changed
- Account overview call update

## [1.1.8] - 2025-05-18

### Changed
- Updated all API endpoints from _mobile to _api format
- Improved API endpoint compatibility with Avanza's latest changes
- Enhanced Stock, Fund, and Chart data endpoints for better reliability

## [1.1.7] - 2025-05-18

### Changed
- Updated all API endpoints from _mobile to _api format
- Improved API endpoint compatibility with Avanza's latest changes
- Enhanced Stock, Fund, and Chart data endpoints for better reliability

## [1.1.6] - 2025-05-17

### Changed
- Search API updates

## [1.1.5] - 2025-05-16

### Changed
- Fixed Github Actions

## [1.1.4] - 2025-05-16

### Changed
- Fix auto release workflow

## [1.1.3] - 2025-05-16

### Changed
- Version bump to fix tests

## [1.1.2] - 2025-05-16

### Changed
- Version bump

## [1.1.1] - 2025-05-16

### Fixed
- Resolved workflow versioning issue

## [1.1.0] - 2025-05-16

### Fixed
- Fixed search endpoint functionality

## [1.0.0] - 2025-05-16

### Added
- Initial release of avanza-api-unofficial
- Authentication support with TOTP
- Real-time data subscription
- Account overview and positions
- Order placement and management
- Market data retrieval
- Watchlist management

### Changed
- Forked from dichai1983/avanza-lib
- Updated to Node.js 22
- Renamed package to avanza-api-unofficial
- Modernized CI/CD with GitHub Actions

### Security
- Requires Node.js 18.0.0 or higher
- Uses secure authentication with TOTP