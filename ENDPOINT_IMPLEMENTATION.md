# Link Person Company Endpoint Implementation Guide

## Overview

The `/api/link-person-company` endpoint should match a person's email domain with a company's domain text field and link them together.

## Expected Endpoint Behavior

**Endpoint:** `POST /api/link-person-company`

**Request Body:**
```json
{
  "personId": "uuid-of-person"
}
```

**Expected Logic:**

1. **Fetch Person Details**
   - Get the person by `personId` from Twenty GraphQL
   - Extract the person's email domain from `emails.primaryEmail`
   - Extract the person's `domain` (text field)

2. **Find Matching Company**
   - Query companies where `domain` (text field) matches the person's domain
   - Use case-insensitive matching
   - Normalize domains (remove www., lowercase, etc.)

3. **Link Person to Company**
   - If a matching company is found, update the person's `companyId` field
   - Return success response

4. **Handle Edge Cases**
   - If no matching company found, return appropriate error
   - If person already linked to a company, optionally update or skip
   - Handle multiple companies with same domain (use first match or most recent)

## Sample GraphQL Queries

### Fetch Person with Domain
```graphql
query GetPerson($id: UUID!) {
  person(id: $id) {
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
```

### Find Company by Domain Text
```graphql
query FindCompanyByDomain($domain: String!) {
  companies(
    limit: 1
    filter: {
      domain: { eq: $domain }
    }
  ) {
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

### Update Person Company
```graphql
mutation UpdatePersonCompany($id: UUID!, $companyId: UUID!) {
  updatePerson(id: $id, data: { companyId: $companyId }) {
    id
    company {
      id
      name
    }
  }
}
```

## Domain Matching Logic

The endpoint should normalize domains before matching:

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
  
  // Lowercase
  return domain.toLowerCase().trim();
}

// Extract domain from email
function extractDomainFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1].toLowerCase().trim();
}
```

## Response Format

**Success Response (200):**
```json
{
  "success": true,
  "personId": "uuid",
  "companyId": "uuid",
  "companyName": "Company Name",
  "domain": "example.com"
}
```

**Error Response (400/404):**
```json
{
  "success": false,
  "error": "No matching company found for domain: example.com"
}
```

## Notes

- The endpoint should use the **domain text field** (not the link field) for matching
- Matching should be case-insensitive
- Consider logging all linking attempts for debugging
- Handle rate limiting if processing many requests


