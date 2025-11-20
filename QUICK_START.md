# Quick Start Guide - Twenty People Company Link

## 5-Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
TWENTY_SERVER_URL=http://localhost:3000
TWENTY_API_KEY=your-api-key-here
```

### 3. Populate Company Domains
```bash
node populate_company_domain_text.mjs
```

### 4. Link All People
```bash
node link_all_people_in_batches.mjs
```

## Common Commands

| Task | Command |
|------|---------|
| Test connection | `node list_companies_and_people.mjs` |
| Check people status | `node find_all_people_with_domains.mjs` |
| Test linking | `node test_btn_linking.mjs` |
| Link specific domain | `node link_btn_people.mjs` |
| Debug company | `node debug_btn_company.mjs` |

## Troubleshooting

**Connection issues?**
- Verify `TWENTY_SERVER_URL` and `TWENTY_API_KEY` in `.env`
- Test with: `node list_companies_and_people.mjs`

**No companies found?**
- Run: `node populate_company_domain_text.mjs`

**People not linking?**
- Check: `node find_all_people_with_domains.mjs`
- Verify people have domain fields populated

**Resume after interruption?**
- Just run the script again - it auto-resumes!

## Full Documentation

See [README.md](./README.md) for complete documentation.

