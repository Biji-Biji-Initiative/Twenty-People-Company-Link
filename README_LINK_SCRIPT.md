# Link All People Script

> **📚 For complete documentation, see [README.md](./README.md)**  
> **⚡ For quick start, see [QUICK_START.md](./QUICK_START.md)**

## Prerequisites: Populate Company Domain Text Field

**Important:** Before running the linking script, you need to ensure companies have a `domain` (text field) populated. This field will be used to match people's email domains to companies.

### Step 1: Create Domain Text Field in Twenty CRM

1. Go to your Twenty CRM instance
2. Navigate to **Settings** → **Objects** → **Company**
3. Create a new field:
   - **Field Name**: `domain` (or `domainText`)
   - **Field Type**: `Text`
   - Save the field

### Step 2: Populate Domain Text Field from Domain Link Field

Run the population script to extract domains from the company's `domain` (link field) and populate the `domain` (text field):

```bash
node populate_company_domain_text.mjs
```

This script will:
- Fetch all companies from Twenty
- Extract the domain from each company's `domain` (link field)
- Populate the `domain` (text field) with the normalized domain (e.g., "example.com")

**Note:** The script automatically handles:
- Removing `http://`, `https://`, `www.`
- Normalizing to lowercase
- Skipping companies that already have the correct domain text

## How to Run the Linking Script

### 1. Install Dependencies

```bash
npm install axios dotenv
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your actual:
- `TWENTY_SERVER_URL` - Your Twenty CRM server URL (e.g., http://localhost:3000 or https://your-instance.twenty.com). The script will append `/graphql` automatically.
- `TWENTY_API_KEY` - Your Twenty API bearer token
- `BATCH_API_URL` - Your local API URL (default: http://localhost:3000)
- `PAGE_SIZE` - Number of people per page (default: 500)
- `CONCURRENCY` - Parallel requests per batch (default: 3)
- `DELAY_MS` - Delay between batches in milliseconds (default: 2000)

**Note:** The script uses GraphQL to fetch people from Twenty. It automatically detects if cursor-based pagination is supported, otherwise falls back to offset-based pagination.

### 3. Run the Script

```bash
node link_all_people_in_batches.mjs
```

### 4. Resume After Interruption

If the script is interrupted, simply run it again. It will automatically resume from the last processed cursor stored in `progress.json`.

To start fresh, delete `progress.json` before running.

## Sample Console Output

```
Starting batch linking process...
Configuration:
  - Page Size: 500
  - Concurrency: 3
  - Delay between batches: 2000ms
  - Twenty GraphQL: http://localhost:3000/graphql
  - Link API: http://localhost:3000

[Page 1] Fetching people...
  Found 500 people in this page
  Processed: 500 | Success: 498 | Failed: 2
  Total so far: 500 processed | 498 succeeded | 2 failed
  Errors in this batch:
    - Person abc123: Person not found
    - Person def456: Company matching failed
  Waiting 2000ms before next batch...

[Page 2] Fetching people...
  Found 500 people in this page
  Processed: 500 | Success: 500 | Failed: 0
  Total so far: 1000 processed | 998 succeeded | 2 failed
  Waiting 2000ms before next batch...

[Page 3] Fetching people...
  Found 250 people in this page
  Processed: 250 | Success: 250 | Failed: 0
  Total so far: 1250 processed | 1248 succeeded | 2 failed

Reached end of people list.

============================================================
PROCESSING COMPLETE
============================================================
Total processed: 1250
Successfully linked: 1248
Failed: 2
============================================================
```

