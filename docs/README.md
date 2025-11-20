# Twenty People Company Link - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [Scripts Reference](#scripts-reference)
7. [Workflow Guide](#workflow-guide)
8. [GraphQL API Reference](#graphql-api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

The **Twenty People Company Link** project is a comprehensive automation toolset for linking people records to company records in Twenty CRM based on email domain matching. The system automatically:

- Extracts domains from company records
- Matches people's email domains to companies
- Links people to their corresponding companies via GraphQL mutations
- Processes large datasets in batches with progress tracking
- Provides utilities for debugging and testing

### Key Features

- **Batch Processing**: Handles large datasets efficiently with configurable batch sizes
- **Progress Tracking**: Automatically saves progress and supports resume functionality
- **Domain Normalization**: Handles various domain formats (with/without protocols, www, etc.)
- **Error Handling**: Comprehensive error tracking and reporting
- **Concurrency Control**: Configurable parallel processing limits
- **GraphQL Integration**: Direct integration with Twenty CRM GraphQL API

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Twenty CRM GraphQL API                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Companies  │  │    People    │  │   Mutations  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ GraphQL Queries/Mutations
                            │
┌─────────────────────────────────────────────────────────────┐
│              Twenty People Company Link Scripts              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Main Scripts                                        │   │
│  │  • link_all_people_in_batches.mjs                   │   │
│  │  • populate_company_domain_text.mjs                 │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Utility Scripts                                   │   │
│  │  • find_all_people_with_domains.mjs                │   │
│  │  • find_missing_people.mjs                         │   │
│  │  • link_btn_people.mjs                            │   │
│  │  • setup_btn_company.mjs                           │   │
│  │  • test_btn_linking.mjs                            │   │
│  │  • debug_btn_company.mjs                           │   │
│  │  • list_companies_and_people.mjs                   │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Local Storage                             │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ progress.json│  │   .env       │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Company Domain Population**:
   - Fetch companies from Twenty CRM
   - Extract domain from company's domain link field
   - Normalize domain (remove protocol, www, etc.)
   - Populate company's domain text field

2. **People Linking**:
   - Fetch all company domains
   - For each domain, query people with matching domain
   - Filter people who aren't already linked
   - Match people to companies by domain
   - Link people to companies via GraphQL mutation

---

## Prerequisites

### Required Software

- **Node.js**: Version 14 or higher
- **npm**: Comes with Node.js
- **Twenty CRM**: A running instance with API access

### Required Twenty CRM Setup

1. **Company Domain Text Field**: A text field named `domain` (or `domainText`) on the Company object
2. **Person Domain Field**: A text field named `domain` on the Person object
3. **API Access**: A valid API key with permissions to:
   - Read companies and people
   - Update people (to link to companies)

### Required Data

- Companies with domain information (either in link field or text field)
- People with email addresses and domain fields populated

---

## Installation & Setup

### Step 1: Clone or Navigate to Project Directory

```bash
cd "Cursor/Twenty People Company Link"
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- `axios`: HTTP client for GraphQL requests
- `dotenv`: Environment variable management

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example if available, or create new
```

Add the following variables:

```env
# Twenty CRM Configuration
TWENTY_SERVER_URL=http://localhost:3000
# OR use TWENTY_BASE_URL (both are supported)
# TWENTY_BASE_URL=https://your-instance.twenty.com

# API Authentication
TWENTY_API_KEY=your-api-bearer-token-here

# Batch Processing Configuration (Optional)
PAGE_SIZE=500
CONCURRENCY=3
DELAY_MS=2000
```

### Step 4: Verify Configuration

Test your connection:

```bash
node list_companies_and_people.mjs
```

This will list companies and people, confirming your API connection works.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWENTY_SERVER_URL` | Yes* | - | Your Twenty CRM server URL (e.g., `http://localhost:3000` or `https://your-instance.twenty.com`) |
| `TWENTY_BASE_URL` | Yes* | - | Alternative to `TWENTY_SERVER_URL` (both supported) |
| `TWENTY_API_KEY` | Yes | - | Your Twenty API bearer token |
| `PAGE_SIZE` | No | `500` | Number of records to process per batch |
| `CONCURRENCY` | No | `3` | Number of parallel requests per batch |
| `DELAY_MS` | No | `2000` | Delay between batches in milliseconds |

*Either `TWENTY_SERVER_URL` or `TWENTY_BASE_URL` must be set.

### Progress Tracking

The system automatically saves progress to `progress.json`:

```json
{
  "processedPersonIds": ["uuid1", "uuid2", ...],
  "totalProcessed": 1250,
  "totalSuccess": 1248,
  "totalSkipped": 0,
  "totalFailed": 2,
  "finished": false
}
```

To start fresh, delete `progress.json` before running scripts.

---

## Scripts Reference

### Main Scripts

#### 1. `populate_company_domain_text.mjs`

**Purpose**: Populates the company domain text field from the domain link field.

**When to Use**: Before running the linking script, ensure companies have their domain text field populated.

**Usage**:
```bash
node populate_company_domain_text.mjs
```

**What it does**:
1. Fetches all companies from Twenty CRM
2. Extracts domain from each company's domain link field
3. Normalizes domain (removes `http://`, `https://`, `www.`, etc.)
4. Updates company's domain text field with normalized domain

**Output Example**:
```
Starting to populate company domain text fields...
GraphQL URL: http://localhost:3000/graphql

[Page 1] Fetching companies...
  Found 150 companies
  [1] Company Name: Updated domain text to "example.com"
  [2] Company Name: Updated domain text to "another.com"
  ...

============================================================
PROCESSING COMPLETE
============================================================
Total processed: 150
Total updated: 148
Total skipped: 2
Total errors: 0
============================================================
```

**Notes**:
- The script uses cursor-based pagination if available
- Skips companies without domain link fields
- Idempotent: safe to run multiple times

---

#### 2. `link_all_people_in_batches.mjs`

**Purpose**: Main script that links all people to companies based on domain matching.

**When to Use**: After companies have domain text fields populated.

**Usage**:
```bash
node link_all_people_in_batches.mjs
```

**What it does**:
1. Loads previous progress (if exists)
2. Fetches all unique company domains
3. For each domain:
   - Queries people with that domain
   - Filters people not already linked
   - Links people to matching company
   - Saves progress after each domain
4. Provides comprehensive progress reporting

**Output Example**:
```
Starting batch linking process...
Configuration:
  - Page Size: 500
  - Concurrency: 3
  - Delay between batches: 2000ms
  - Twenty GraphQL: http://localhost:3000/graphql
  - Linking: Direct GraphQL (no local API needed)

Step 1: Getting all company domains...
  Found 150 unique company domains
  Sample domains found: example.com, another.com, test.org, ...

Step 2: Processing people by domain...

[Domain 1/150] Processing domain: example.com
  Found 25 people with domain "example.com"
  People to process: 20 (not yet linked)
    Processed 3: Success: 3 | Failed: 0
    Processed 3: Success: 3 | Failed: 0
    ...
  Total so far: 20 processed | 20 succeeded | 0 skipped | 0 failed

[Domain 2/150] Processing domain: another.com
  ...

============================================================
PROCESSING COMPLETE
============================================================
Total processed: 1250
Successfully linked: 1248
Skipped (already linked): 0
Failed: 2
============================================================
```

**Resume Functionality**:
- If interrupted, simply run again
- Automatically resumes from last processed domain
- Tracks processed person IDs to avoid duplicates

**Error Handling**:
- Continues processing even if individual links fail
- Reports all errors at the end
- Saves progress after each domain

---

### Utility Scripts

#### 3. `find_all_people_with_domains.mjs`

**Purpose**: Analyzes all people and reports domain field status.

**Usage**:
```bash
node find_all_people_with_domains.mjs
```

**What it does**:
- Fetches all people from Twenty CRM
- Categorizes people by domain field status
- Lists people with domains but not linked
- Provides debug information

**Output**:
- Total people count
- People with domain field
- People without domain field
- People with domain but not linked
- People with domain and linked
- Detailed list of unlinked people

---

#### 4. `find_missing_people.mjs`

**Purpose**: Finds people with specific domains that might be missing from queries.

**Usage**:
```bash
node find_missing_people.mjs
```

**What it does**:
- Compares people found by filter vs. all people query
- Identifies discrepancies
- Useful for debugging domain matching issues

**Configuration**: Edit the script to change the domain being checked (default: `btn.co.id`).

---

#### 5. `link_btn_people.mjs`

**Purpose**: Links people with a specific domain (default: `btn.co.id`) to their company.

**Usage**:
```bash
node link_btn_people.mjs
```

**What it does**:
1. Finds all people with the specified domain
2. Finds the matching company
3. Links all unlinked people to the company

**Use Case**: Quick linking for a specific domain without processing all domains.

---

#### 6. `setup_btn_company.mjs`

**Purpose**: Creates or finds the BTN company and sets it up for linking.

**Usage**:
```bash
node setup_btn_company.mjs
```

**What it does**:
- Searches for existing BTN company
- Creates company if not found
- Sets up domain information
- Provides next steps

**Configuration**: Edit script constants to change company name/domain.

---

#### 7. `test_btn_linking.mjs`

**Purpose**: Tests the linking system for a specific domain (default: `btn.co.id`).

**Usage**:
```bash
node test_btn_linking.mjs
```

**What it does**:
1. Finds company with test domain
2. Finds people with test domain
3. Tests linking one person
4. Reports results

**Use Case**: Verify the linking system works before running full batch.

---

#### 8. `debug_btn_company.mjs`

**Purpose**: Debugs and finds BTN company using various query methods.

**Usage**:
```bash
node debug_btn_company.mjs
```

**What it does**:
- Tries multiple query strategies to find company
- Useful when company search fails
- Provides detailed debugging information

---

#### 9. `list_companies_and_people.mjs`

**Purpose**: Lists all companies and people with a specific domain.

**Usage**:
```bash
node list_companies_and_people.mjs
```

**What it does**:
- Lists all companies with their domains
- Lists all people with specified domain (default: `btn.co.id`)
- Shows linking status

---

## Workflow Guide

### Complete Setup Workflow

#### Step 1: Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
# Edit .env with your Twenty CRM credentials

# 3. Verify connection
node list_companies_and_people.mjs
```

#### Step 2: Prepare Company Domain Fields

```bash
# Populate company domain text fields from link fields
node populate_company_domain_text.mjs
```

**Expected Result**: All companies should have their domain text field populated.

#### Step 3: Verify People Have Domain Fields

```bash
# Check people domain field status
node find_all_people_with_domains.mjs
```

**Expected Result**: People should have domain fields populated (either manually or via import).

#### Step 4: Test Linking (Optional but Recommended)

```bash
# Test with a specific domain
node test_btn_linking.mjs
```

**Expected Result**: Should successfully link test person to company.

#### Step 5: Run Full Linking

```bash
# Link all people to companies
node link_all_people_in_batches.mjs
```

**Expected Result**: All people with matching domains are linked to companies.

#### Step 6: Verify Results

```bash
# Check final status
node find_all_people_with_domains.mjs
```

**Expected Result**: Most people with domains should now be linked.

---

### Troubleshooting Workflow

If linking fails:

1. **Check Company Setup**:
   ```bash
   node debug_btn_company.mjs
   ```

2. **Check People Status**:
   ```bash
   node find_missing_people.mjs
   ```

3. **Test Single Domain**:
   ```bash
   node link_btn_people.mjs
   ```

4. **Review Progress**:
   ```bash
   cat progress.json
   ```

---

## GraphQL API Reference

### Queries

#### List Companies

```graphql
query ListCompanies($limit: Int!, $cursor: String) {
  companies(limit: $limit, cursor: $cursor) {
    edges {
      node {
        id
        name
        domain
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

#### Find Company by Domain

```graphql
query FindCompanyByDomain($domain: String!) {
  companies(limit: 1, filter: { domain: { eq: $domain } }) {
    edges {
      node {
        id
        name
        domain
      }
    }
  }
}
```

#### List People

```graphql
query ListPeople($limit: Int!) {
  people(limit: $limit) {
    edges {
      node {
        id
        emails {
          primaryEmail
        }
        domain
        company {
          id
          name
        }
      }
    }
  }
}
```

#### Find People by Domain

```graphql
query FindPeopleByDomain($domain: String!) {
  people(limit: 1000, filter: { domain: { eq: $domain } }) {
    edges {
      node {
        id
        emails {
          primaryEmail
        }
        domain
        company {
          id
          name
        }
      }
    }
  }
}
```

#### Get Person by ID

```graphql
query GetPerson($id: UUID!) {
  people(limit: 1, filter: { id: { eq: $id } }) {
    edges {
      node {
        id
        emails {
          primaryEmail
        }
        domain
        company {
          id
          name
        }
      }
    }
  }
}
```

### Mutations

#### Update Company Domain Text Field

```graphql
mutation UpdateCompanyDomainText($id: UUID!, $domainText: String) {
  updateCompany(id: $id, data: { domainText: $domainText }) {
    id
    name
    domainText
  }
}
```

**Note**: Field name may vary (`domain`, `domainText`, etc.) based on your schema.

#### Link Person to Company

```graphql
mutation UpdatePersonCompany($id: UUID!, $companyId: ID!) {
  updatePerson(id: $id, data: { companyId: $companyId }) {
    id
    company {
      id
      name
    }
  }
}
```

#### Create Company

```graphql
mutation CreateCompany($data: CompanyCreateInput!) {
  createCompany(data: $data) {
    id
    name
    domain
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "TWENTY_SERVER_URL and TWENTY_API_KEY must be set"

**Problem**: Environment variables not configured.

**Solution**:
- Create `.env` file in project root
- Add `TWENTY_SERVER_URL` and `TWENTY_API_KEY`
- Ensure no trailing slashes in URL

#### 2. "Failed to fetch companies: ..."

**Problem**: API connection issue.

**Solutions**:
- Verify `TWENTY_SERVER_URL` is correct
- Check API key is valid
- Ensure Twenty CRM instance is accessible
- Check network/firewall settings

#### 3. "No company found with domain: ..."

**Problem**: Company domain text field not populated.

**Solution**:
```bash
node populate_company_domain_text.mjs
```

#### 4. "Person has no domain field set"

**Problem**: People don't have domain fields populated.

**Solution**:
- Manually populate domain fields in Twenty CRM
- Or use import script to populate from email addresses
- Verify domain field exists on Person object

#### 5. "GraphQL errors: Field 'domainText' doesn't exist"

**Problem**: Field name mismatch.

**Solution**:
- Check actual field name in Twenty CRM schema
- Update mutation queries in scripts
- Common names: `domain`, `domainText`, `domainName`

#### 6. Progress Not Resuming

**Problem**: `progress.json` corrupted or missing.

**Solution**:
- Delete `progress.json` to start fresh
- Or manually edit to fix structure
- Ensure file is valid JSON

#### 7. Rate Limiting Errors

**Problem**: Too many requests too quickly.

**Solution**:
- Increase `DELAY_MS` in `.env`
- Decrease `CONCURRENCY` in `.env`
- Add delays between requests

#### 8. Timeout Errors

**Problem**: Large datasets causing timeouts.

**Solution**:
- Increase timeout values in scripts (default: 30000ms)
- Process in smaller batches (reduce `PAGE_SIZE`)
- Check network connection stability

### Debugging Tips

1. **Enable Verbose Logging**: Add `console.log` statements in scripts
2. **Test with Small Dataset**: Use test scripts first
3. **Check GraphQL Responses**: Log `response.data` to see actual API responses
4. **Verify Field Names**: Use GraphQL introspection or Twenty CRM UI
5. **Check Progress File**: Review `progress.json` for processed IDs

---

## Best Practices

### 1. Data Preparation

- **Before Linking**: Ensure all companies have domain text fields populated
- **Domain Normalization**: Use consistent domain format (lowercase, no www, no protocol)
- **Data Validation**: Verify people have valid email addresses and domain fields

### 2. Batch Processing

- **Start Small**: Test with small batches first
- **Monitor Progress**: Check `progress.json` regularly
- **Resume Safely**: Scripts are idempotent, safe to rerun

### 3. Error Handling

- **Review Errors**: Check error logs after each run
- **Handle Edge Cases**: Multiple companies with same domain
- **Log Everything**: Keep detailed logs for debugging

### 4. Performance

- **Concurrency**: Adjust based on API rate limits
- **Delays**: Add appropriate delays between batches
- **Pagination**: Use cursor-based pagination when available

### 5. Security

- **API Keys**: Never commit `.env` file to version control
- **Permissions**: Use API keys with minimal required permissions
- **Validation**: Validate all inputs before processing

### 6. Maintenance

- **Regular Updates**: Keep dependencies updated
- **Backup Progress**: Backup `progress.json` before major runs
- **Monitor API Changes**: Twenty CRM API may change, update scripts accordingly

---

## Advanced Usage

### Custom Domain Matching

To implement custom domain matching logic, modify the `normalizeDomain` function in scripts:

```javascript
function normalizeDomain(domain) {
  if (!domain) return null;
  
  // Remove protocol
  domain = domain.replace(/^https?:\/\//i, '');
  
  // Remove www.
  domain = domain.replace(/^www\./i, '');
  
  // Remove trailing slash and path
  domain = domain.split('/')[0];
  
  // Remove port
  domain = domain.split(':')[0];
  
  // Custom normalization
  domain = domain.toLowerCase().trim();
  
  // Handle special cases
  if (domain === 'example.co.uk') {
    domain = 'example.com'; // Custom mapping
  }
  
  return domain;
}
```

### Processing Specific Domains Only

Modify `link_all_people_in_batches.mjs` to filter domains:

```javascript
// In getAllCompanyDomains function
const domains = new Set();
// ... existing code ...

// Filter to specific domains only
const allowedDomains = ['example.com', 'another.com'];
const filteredDomains = Array.from(domains).filter(d => 
  allowedDomains.includes(d)
);
return filteredDomains;
```

### Custom Error Handling

Add custom error handling in `linkPerson` function:

```javascript
async function linkPerson(personData) {
  try {
    // ... existing code ...
  } catch (error) {
    // Custom error handling
    if (error.message.includes('rate limit')) {
      // Wait and retry
      await sleep(5000);
      return linkPerson(personData); // Retry
    }
    // ... existing error handling ...
  }
}
```

---

## API Endpoint Implementation (Reference)

If you need to implement a REST API endpoint instead of direct GraphQL, see [ENDPOINT_IMPLEMENTATION.md](./ENDPOINT_IMPLEMENTATION.md) for the expected endpoint specification.

**Expected Endpoint**: `POST /api/link-person-company`

**Request**:
```json
{
  "personId": "uuid-of-person"
}
```

**Response**:
```json
{
  "success": true,
  "personId": "uuid",
  "companyId": "uuid",
  "companyName": "Company Name",
  "domain": "example.com"
}
```

---

## Support & Contributing

### Getting Help

1. Check this documentation first
2. Review error messages and logs
3. Test with utility scripts
4. Check Twenty CRM API documentation

### Reporting Issues

When reporting issues, include:
- Script name and version
- Error messages
- Configuration (without sensitive data)
- Steps to reproduce
- Relevant log output

### Contributing

To contribute improvements:
1. Test changes thoroughly
2. Update documentation
3. Follow existing code style
4. Add error handling
5. Test with various datasets

---

## License

This project is provided as-is for use with Twenty CRM.

---

## Changelog

### Version 1.0.0
- Initial release
- Batch linking functionality
- Progress tracking
- Utility scripts
- Comprehensive error handling

---

## Appendix

### Domain Normalization Examples

| Input | Normalized Output |
|-------|-------------------|
| `https://www.example.com` | `example.com` |
| `http://example.com` | `example.com` |
| `www.example.com` | `example.com` |
| `example.com:8080` | `example.com` |
| `example.com/path` | `example.com` |
| `EXAMPLE.COM` | `example.com` |

### Field Name Variations

The scripts support various field name conventions. Common variations:

- **Company Domain**: `domain`, `domainText`, `domainName`, `companyDomain`
- **Person Domain**: `domain`, `emailDomain`, `personDomain`

Update GraphQL queries if your schema uses different names.

---

**Last Updated**: 2024
**Version**: 1.0.0

