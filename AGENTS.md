# AGENTS.md

## Repository Overview
JavaScript automation layer for Twenty CRM integrations at Biji-Biji Initiative. Handles data synchronization and automated workflows between Twenty CRM and external services.

## Core Commands
- Install: `npm install`
- Dev: `npm run dev` — Start automation watcher
- Test: `npm test`
- Manual sync: `node scripts/sync.js`
- Build: `npm run build`

## Project Structure
- `src/` — Main automation logic
- `scripts/` — Utility scripts and manual triggers
- `config/` — Configuration files
- `tests/` — Test files

## Integrations
- Twenty CRM API: `TWENTY_API_URL` (configure in `.env`)
- Authentication: Bearer token via `TWENTY_API_KEY`
- Rate limiting: Respect API rate limits (configurable)

## Conventions
- Test automations against staging CRM first
- Log all API mutations for audit trail
- Handle API errors gracefully with retries
- Use environment variables for all endpoints

## Validation Requirements
Before marking work as complete:
- Run: `npm test`
- Run: `npm run lint`
- Test sync scripts against staging environment
- Verify logging is working correctly

## Deployment (VPS)
- Process manager: PM2 (`pm2 start ecosystem.config.js`)
- Reverse proxy: Caddy
- Domain: `*.mereka.dev`
- Logs: `pm2 logs twenty-automation`
- Ask before: modifying `ecosystem.config.js` or Caddyfile

## Boundaries
- ✅ Always: Test against staging CRM, log all mutations, handle errors gracefully
- ⚠️ Ask First: Changes to sync frequency, new automation additions, bulk operations
- 🚫 Never: Run bulk operations without dry-run, skip error handling, commit API keys

## Escalation Rules
Ask a human when:
- Sync failures persist after 2 retry attempts
- New CRM entities need to be synchronized
- Bulk operations are required

---
Last updated: 2026-03-02
