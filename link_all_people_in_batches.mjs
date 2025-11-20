import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration from environment
const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const PAGE_SIZE = parseInt(process.env.PAGE_SIZE || '500', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || '2000', 10);

// API endpoint configuration
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

// Progress file path
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

// GraphQL query - get all people
const LIST_PEOPLE_QUERY = `
  query ListPeople($limit: Int!) {
    people(limit: $limit) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

// Query to get all people with their emails and domain fields
const LIST_PEOPLE_WITH_DOMAIN_QUERY = `
  query ListPeopleWithDomain($limit: Int!) {
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
`;

// Validate required environment variables
if (!TWENTY_SERVER_URL || !TWENTY_API_KEY) {
  console.error('Error: TWENTY_SERVER_URL (or TWENTY_BASE_URL) and TWENTY_API_KEY must be set in .env file');
  process.exit(1);
}

/**
 * Load progress from file
 */
async function loadProgress() {
  try {
    const content = await fs.readFile(PROGRESS_FILE, 'utf-8');
    const progress = JSON.parse(content);
    // Convert processedPersonIds array back to Set if it exists
    if (progress.processedPersonIds) {
      progress.processedPersonIds = new Set(progress.processedPersonIds);
    }
    return progress;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { processedPersonIds: new Set(), finished: false };
    }
    throw error;
  }
}

/**
 * Save progress to file
 */
async function saveProgress(progress) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get person details and find matching company by domain
 */
async function getPersonAndCompany(personId) {
  // Since we already have the person data from fetchAllPeople, 
  // we can just use that instead of making another query
  // But for now, let's query it to get fresh data including company status
  const GET_PERSON_QUERY = `
    query GetPerson($id: ID!) {
      people(limit: 1000) {
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
  `;

  try {
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: GET_PERSON_QUERY,
        variables: {},
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

    const edges = response.data.data?.people?.edges || [];
    const person = edges.find(edge => edge.node.id === personId);
    return person ? person.node : null;
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to get person: ${errorMessage}`);
  }
}

/**
 * Find company by domain
 */
async function findCompanyByDomain(domain) {
  const normalizedDomain = domain.toLowerCase().trim();
  
  const FIND_COMPANY_QUERY = `
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
  `;

  try {
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: FIND_COMPANY_QUERY,
        variables: { domain: normalizedDomain },
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

    const edges = response.data.data?.companies?.edges || [];
    return edges.length > 0 ? edges[0].node : null;
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to find company: ${errorMessage}`);
  }
}

/**
 * Link person to company
 */
async function linkPersonToCompany(personId, companyId) {
  const UPDATE_PERSON_MUTATION = `
    mutation UpdatePersonCompany($id: UUID!, $companyId: ID!) {
      updatePerson(id: $id, data: { companyId: $companyId }) {
        id
        company {
          id
          name
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: UPDATE_PERSON_MUTATION,
        variables: { id: personId, companyId },
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

    return response.data.data?.updatePerson;
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to link person: ${errorMessage}`);
  }
}

/**
 * Process a single person by linking to company based on domain
 * personData should already contain the person info from fetchPeopleBatch
 * This function assumes the person has a domain field filled and no company linked
 */
async function linkPerson(personData) {
  const personId = personData.id;
  
  try {
    // Use the person data we already have
    const person = personData;
    
    if (!person) {
      return { success: false, personId, error: 'Person data missing' };
    }

    // Get domain from person (text field) - should already be filled based on our filter
    let personDomain = person.domain;
    
    // Validate domain field
    if (!personDomain || typeof personDomain !== 'string' || !personDomain.trim() || personDomain.trim() === '') {
      return { success: false, personId, error: 'Person has no domain field set' };
    }

    // Normalize domain
    personDomain = personDomain.toLowerCase().trim();

    // Find matching company
    const company = await findCompanyByDomain(personDomain);
    if (!company) {
      return { success: false, personId, error: `No company found with domain: ${personDomain}` };
    }

    // Link person to company
    await linkPersonToCompany(personId, company.id);
    
    return { success: true, personId, companyId: company.id, companyName: company.name, domain: personDomain };
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    return { success: false, personId, error: errorMessage };
  }
}

/**
 * Process a batch of people with concurrency control
 */
async function processBatch(people, batchNumber) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Process in chunks of CONCURRENCY size
  for (let i = 0; i < people.length; i += CONCURRENCY) {
    const chunk = people.slice(i, i + CONCURRENCY);
    const promises = chunk.map(person => linkPerson(person));
    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const linkResult = result.value;
        if (linkResult.success) {
          if (linkResult.skipped) {
            results.skipped++;
          } else {
            results.success++;
          }
        } else {
          results.failed++;
          results.errors.push({
            personId: linkResult.personId,
            error: linkResult.error,
          });
        }
      } else {
        results.failed++;
        results.errors.push({
          personId: 'unknown',
          error: result.reason?.message || 'Promise rejected',
        });
      }
    }
  }

  return results;
}

/**
 * Get all unique company domains (from domain text field)
 * Note: The domain text field might be named "domain", "domainText", or "domainName"
 * We'll try to get it from the domain field (assuming it's the text field if it's a simple string)
 */
async function getAllCompanyDomains() {
  // Try to get domain text field - it might be called "domain", "domainText", etc.
  // We'll try multiple field names
  const GET_COMPANIES_QUERY = `
    query GetCompanies($limit: Int!) {
      companies(limit: $limit) {
        edges {
          node {
            id
            name
            domain
          }
        }
      }
    }
  `;
  
  // Also try to get domainText field if it exists
  const GET_COMPANIES_WITH_DOMAIN_TEXT_QUERY = `
    query GetCompaniesWithDomainText($limit: Int!) {
      companies(limit: $limit) {
        edges {
          node {
            id
            name
            domain
            domainText
          }
        }
      }
    }
  `;

  // Use basic query - we know btn.co.id works, so we'll also manually add known domains
  const response = await axios.post(
    GRAPHQL_URL,
    {
      query: GET_COMPANIES_QUERY,
      variables: { limit: 10000 },
    },
    {
      headers: {
        'Authorization': `Bearer ${TWENTY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // Increase timeout for large datasets
    }
  );

  if (response.data.errors) {
    throw new Error(response.data.errors.map(e => e.message).join('; '));
  }

  const edges = response.data.data?.companies?.edges || [];
  const domains = new Set();
  
  edges.forEach(edge => {
    const node = edge.node;
    const domain = node.domain;
    
    if (domain && typeof domain === 'string' && domain.trim()) {
      // Normalize domain - handle both link fields and text fields
      let normalized = domain.toLowerCase().trim();
      
      // If it's a URL, extract the domain
      if (normalized.includes('://')) {
        normalized = normalized.replace(/^https?:\/\//i, '');
      }
      if (normalized.startsWith('www.')) {
        normalized = normalized.replace(/^www\./i, '');
      }
      normalized = normalized.split('/')[0].split(':')[0];
      
      if (normalized) {
        domains.add(normalized);
      }
    }
  });

  // Also add known domains that we know have people (like btn.co.id)
  // This ensures we don't miss domains that might not be in company records yet
  domains.add('btn.co.id');

  console.log(`  Sample domains found: ${Array.from(domains).slice(0, 10).join(', ')}`);
  return Array.from(domains);
}

/**
 * Find people with a specific domain using filter
 */
async function findPeopleByDomain(domain) {
  const FIND_PEOPLE_QUERY = `
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
  `;

  try {
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: FIND_PEOPLE_QUERY,
        variables: { domain },
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
      console.log(`    Warning: Error querying people for domain ${domain}: ${response.data.errors.map(e => e.message).join('; ')}`);
      return [];
    }

    const edges = response.data.data?.people?.edges || [];
    return edges.map(edge => edge.node);
  } catch (error) {
    console.log(`    Warning: Failed to query people for domain ${domain}: ${error.message}`);
    return [];
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('Starting batch linking process...');
  console.log(`Configuration:
  - Page Size: ${PAGE_SIZE}
  - Concurrency: ${CONCURRENCY}
  - Delay between batches: ${DELAY_MS}ms
  - Twenty GraphQL: ${GRAPHQL_URL}
  - Linking: Direct GraphQL (no local API needed)
`);

  // Load progress
  const progress = await loadProgress();
  let processedPersonIds = new Set(progress.processedPersonIds || []);
  let totalProcessed = progress.totalProcessed || 0;
  let totalSuccess = progress.totalSuccess || 0;
  let totalFailed = progress.totalFailed || 0;
  let totalSkipped = progress.totalSkipped || 0;

  if (processedPersonIds.size > 0) {
    console.log(`Resuming: ${processedPersonIds.size} people already processed`);
    console.log(`Previous progress: ${totalProcessed} processed, ${totalSuccess} succeeded, ${totalSkipped} skipped, ${totalFailed} failed\n`);
  }

  try {
    // Strategy: Since the "all people" query doesn't return domain field values,
    // we need to query people by domain filters. We'll:
    // 1. Get all company domains (from domain text field)
    // 2. For each domain, query people with that domain
    // 3. Process people who have domain filled and no company linked
    
    console.log('Step 1: Getting all company domains...');
    const companyDomains = await getAllCompanyDomains();
    console.log(`  Found ${companyDomains.length} unique company domains\n`);

    console.log('Step 2: Processing people by domain...\n');
    
    let batchNumber = 0;
    
    // Process each domain
    for (const domain of companyDomains) {
      batchNumber++;
      console.log(`[Domain ${batchNumber}/${companyDomains.length}] Processing domain: ${domain}`);
      
      // Query people with this domain
      const peopleWithDomain = await findPeopleByDomain(domain);
      console.log(`  Found ${peopleWithDomain.length} people with domain "${domain}"`);
      
      if (peopleWithDomain.length === 0) {
        continue;
      }

      // Filter: Only process people who:
      // 1. Haven't been processed yet
      // 2. Don't have company linked yet
      const peopleToProcess = peopleWithDomain.filter(p => {
        if (processedPersonIds.has(p.id)) {
          return false; // Already processed
        }
        
        // Check if company is empty
        if (p.company?.id) {
          return false; // Already linked
        }
        
        return true; // Has domain and no company - process this person
      });

      console.log(`  People to process: ${peopleToProcess.length} (not yet linked)`);

      if (peopleToProcess.length > 0) {
        // Process in smaller batches for this domain
        for (let i = 0; i < peopleToProcess.length; i += CONCURRENCY) {
          const chunk = peopleToProcess.slice(i, i + CONCURRENCY);
          const chunkResults = await processBatch(chunk, batchNumber);
          
          totalProcessed += chunk.length;
          totalSuccess += chunkResults.success;
          totalFailed += chunkResults.failed;
          totalSkipped += chunkResults.skipped || 0;

          // Mark as processed
          chunk.forEach(p => processedPersonIds.add(p.id));

          console.log(`    Processed ${chunk.length}: Success: ${chunkResults.success} | Failed: ${chunkResults.failed}`);
        }
      } else {
        // Mark all as processed even if we skipped them
        peopleWithDomain.forEach(p => processedPersonIds.add(p.id));
      }

      // Update progress after each domain
      const newProgress = {
        processedPersonIds: Array.from(processedPersonIds),
        totalProcessed,
        totalSuccess,
        totalSkipped,
        totalFailed,
        finished: batchNumber >= companyDomains.length,
      };
      await saveProgress(newProgress);

      console.log(`  Total so far: ${totalProcessed} processed | ${totalSuccess} succeeded | ${totalSkipped} skipped | ${totalFailed} failed\n`);

      // Delay before next domain
      if (batchNumber < companyDomains.length) {
        await sleep(DELAY_MS);
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('PROCESSING COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Successfully linked: ${totalSuccess}`);
    console.log(`Skipped (already linked): ${totalSkipped}`);
    console.log(`Failed: ${totalFailed}`);
    console.log('='.repeat(60));

    // Mark as finished
    await saveProgress({
      processedPersonIds: Array.from(processedPersonIds),
      totalProcessed,
      totalSuccess,
      totalSkipped,
      totalFailed,
      finished: true,
    });

  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    console.error('Progress has been saved. You can resume by running the script again.');
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});

