import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

// GraphQL query to fetch all companies
// This queries the domain link field (assuming it's named "domain" with link type)
// If your link field has a different name, adjust accordingly
const LIST_COMPANIES_QUERY = `
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
`;

// GraphQL mutation to update company domain text field
// NOTE: Adjust the field name "domainText" to match your Twenty CRM schema
// If your text field is named "domain", change "domainText" to "domain"
const UPDATE_COMPANY_DOMAIN_TEXT_MUTATION = `
  mutation UpdateCompanyDomainText($id: UUID!, $domainText: String) {
    updateCompany(id: $id, data: { domainText: $domainText }) {
      id
      name
      domainText
    }
  }
`;

/**
 * Extract domain from a URL/link field
 * Examples:
 *   "https://www.example.com/" -> "example.com"
 *   "http://example.com" -> "example.com"
 *   "www.example.com" -> "example.com"
 *   "example.com" -> "example.com"
 */
function extractDomainFromLink(linkField) {
  if (!linkField || typeof linkField !== 'string') {
    return null;
  }

  let domain = linkField.trim();

  // Remove protocol (http://, https://)
  domain = domain.replace(/^https?:\/\//i, '');

  // Remove www.
  domain = domain.replace(/^www\./i, '');

  // Remove trailing slash and path
  domain = domain.split('/')[0];

  // Remove port if present
  domain = domain.split(':')[0];

  // Remove query parameters
  domain = domain.split('?')[0];

  return domain.toLowerCase();
}

/**
 * Fetch companies from Twenty API
 */
async function fetchCompanies(cursor = null) {
  try {
    const variables = {
      limit: 500,
    };
    if (cursor) {
      variables.cursor = cursor;
    }

    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: LIST_COMPANIES_QUERY,
        variables,
      },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors.map(e => e.message).join('; '));
    }

    const companiesData = response.data.data?.companies || {};
    const edges = companiesData.edges || [];
    const companies = edges.map(edge => edge.node);
    const nextCursor = companiesData.pageInfo?.endCursor || null;
    const hasNextPage = companiesData.pageInfo?.hasNextPage || false;

    return { companies, nextCursor, hasNextPage };
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to fetch companies: ${errorMessage}`);
  }
}

/**
 * Update company domain text field
 */
async function updateCompanyDomainText(companyId, domainText) {
  try {
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: UPDATE_COMPANY_DOMAIN_TEXT_MUTATION,
        variables: {
          id: companyId,
          domainText: domainText,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors.map(e => e.message).join('; '));
    }

    return response.data.data?.updateCompany;
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to update company: ${errorMessage}`);
  }
}

/**
 * Main function to populate domain text field
 */
async function main() {
  console.log('Starting to populate company domain text fields...');
  console.log(`GraphQL URL: ${GRAPHQL_URL}\n`);

  if (!TWENTY_SERVER_URL || !TWENTY_API_KEY) {
    console.error('Error: TWENTY_SERVER_URL and TWENTY_API_KEY must be set in .env file');
    process.exit(1);
  }

  let cursor = null;
  let pageNumber = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    while (true) {
      pageNumber++;
      console.log(`[Page ${pageNumber}] Fetching companies...`);

      const { companies, nextCursor, hasNextPage } = await fetchCompanies(cursor);

      if (companies.length === 0) {
        console.log('No more companies to process.');
        break;
      }

      console.log(`  Found ${companies.length} companies`);

      for (const company of companies) {
        totalProcessed++;

        // Get domain from link field
        // Assumes company has "domain" (link field) and we're populating "domainText" (text field)
        // Adjust field names if your schema uses different names
        const domainLink = company.domain; // Link field (e.g., "https://www.example.com")
        // Note: domainText won't be in the query result initially, but we'll populate it

        if (!domainLink) {
          console.log(`  [${totalProcessed}] ${company.name}: No domain link field, skipping`);
          totalSkipped++;
          continue;
        }

        // Extract domain from link
        const extractedDomain = extractDomainFromLink(domainLink);

        if (!extractedDomain) {
          console.log(`  [${totalProcessed}] ${company.name}: Could not extract domain from "${domainLink}", skipping`);
          totalSkipped++;
          continue;
        }

        // Note: We skip checking existing domainText since it's not in the query
        // The mutation will update it regardless (idempotent operation)

        // Update the domain text field
        try {
          await updateCompanyDomainText(company.id, extractedDomain);
          console.log(`  [${totalProcessed}] ${company.name}: Updated domain text to "${extractedDomain}"`);
          totalUpdated++;
        } catch (error) {
          console.error(`  [${totalProcessed}] ${company.name}: Error updating - ${error.message}`);
          totalErrors++;
        }
      }

      if (!hasNextPage || !nextCursor) {
        break;
      }

      cursor = nextCursor;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total updated: ${totalUpdated}`);
    console.log(`Total skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});

