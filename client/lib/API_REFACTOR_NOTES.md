# API Refactor - File Location Reference

## Discovered File Paths

### API & Query Files
- **Query Client Helper**: `./client/lib/query-client.ts` (145 lines)
  - Contains: query client setup, API request utilities, getApiUrl() function
- **ZEKE API Adapter**: `./client/lib/zeke-api-adapter.ts` (2051 lines) ⭐ **LARGE FILE**
  - Contains: comprehensive API adapter for all ZEKE app endpoints

### Context & Auth
- **Auth Context**: `./client/context/AuthContext.tsx` (177 lines)
  - Contains: authentication state management and context provider

## URL Routing Helpers
- **getApiUrl()**: Defined in `./client/lib/query-client.ts`
- **getLocalApiUrl()**: Not found (may not exist or embedded in getApiUrl)

## Key Notes
- The zeke-api-adapter.ts file is the main API adapter file (~2000 lines) that likely contains:
  - API endpoint definitions
  - Request/response handling
  - Data transformation logic
  - Integration with external services (Google Calendar, Twilio, OpenAI, GitHub, etc.)

## Last Updated
- Date: 2025-12-20
- Status: Discovery complete
