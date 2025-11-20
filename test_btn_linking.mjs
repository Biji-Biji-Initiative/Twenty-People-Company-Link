import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

const TEST_DOMAIN = 'btn.co.id';

/**
 * Normalize domain for comparison
 */
function normalizeDomain(domain) {
  if (!domain) return null;
  return domain.toLowerCase().trim().replace(/^www\./i, '');
}

/**
 * Extract domain from email
 */
function extractDomainFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1].toLowerCase().trim();
}

/**
 * Find people with btn.co.id domain (with pagination)
 */
async function findPeopleWithDomain(domain, limit = 10) {
  try {
    const query = `
      query FindPeopleByDomain($limit: Int!) {
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

    const normalizedDomain = normalizeDomain(domain);
    
    // Try filter first
    const filterQuery = `
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

    let response = await axios.post(
      GRAPHQL_URL,
      {
        query: filterQuery,
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

    let allMatchingPeople = [];
    let totalChecked = 0;

    // If filter works, use it
    if (!response.data.errors) {
      const edges = response.data.data?.people?.edges || [];
      totalChecked = edges.length;
      allMatchingPeople = edges.map(edge => edge.node);
      console.log(`   Found ${allMatchingPeople.length} people using domain filter`);
    } else {
      // Fallback: Query all people and filter
      response = await axios.post(
        GRAPHQL_URL,
        {
          query,
          variables: { limit: 10000 },
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
      totalChecked = edges.length;

      allMatchingPeople = edges
        .map(edge => edge.node)
        .filter(person => {
          const email = person.emails?.primaryEmail;
          const personDomain = person.domain ? normalizeDomain(person.domain) : null;
          
          // Check domain field first (text field)
          if (personDomain === normalizedDomain) {
            return true;
          }
          
          // Also check email domain as fallback
          if (email) {
            const emailDomain = extractDomainFromEmail(email);
            return normalizeDomain(emailDomain) === normalizedDomain;
          }
          
          return false;
        });
      
      console.log(`   Checked ${totalChecked} people total, found ${allMatchingPeople.length} matches`);
    }

    return allMatchingPeople.slice(0, limit);
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to find people: ${errorMessage}`);
  }
}

/**
 * Find company with domain
 */
async function findCompanyByDomain(domain) {
  try {
    const normalizedDomain = normalizeDomain(domain);

    // Try to find company by domain filter first (most efficient)
    const filterQuery = `
      query FindCompanyByDomain($domain: String!) {
        companies(limit: 100, filter: { domain: { eq: $domain } }) {
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

    let response = await axios.post(
      GRAPHQL_URL,
      {
        query: filterQuery,
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

    // If filter works, use it
    if (!response.data.errors) {
      const edges = response.data.data?.companies?.edges || [];
      if (edges.length > 0) {
        const company = edges[0].node;
        console.log(`   Found using domain filter`);
        return company;
      }
    }

    // Fallback: Query all companies and search
    const query = `
      query FindCompanyByDomain($limit: Int!) {
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

    response = await axios.post(
      GRAPHQL_URL,
      {
        query,
        variables: { limit: 10000 },
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
    console.log(`   Checking ${edges.length} companies...`);
    
    const matchingCompany = edges
      .map(edge => edge.node)
      .find(company => {
        if (!company.domain) return false;
        
        // If domain is a text field, it should be exactly "btn.co.id"
        // If domain is a link field, it might be "https://btn.co.id"
        let companyDomain = company.domain;
        
        // Check if it's already a plain text domain (no protocol)
        if (!companyDomain.includes('://') && !companyDomain.startsWith('www.')) {
          // It's a text field, compare directly
          return normalizeDomain(companyDomain) === normalizedDomain;
        }
        
        // It's a link field, extract domain
        companyDomain = companyDomain.replace(/^https?:\/\//i, '');
        companyDomain = companyDomain.replace(/^www\./i, '');
        companyDomain = companyDomain.split('/')[0];
        companyDomain = companyDomain.split(':')[0];
        companyDomain = normalizeDomain(companyDomain);
        
        return companyDomain === normalizedDomain;
      });

    return matchingCompany || null;
  } catch (error) {
    const errorMessage = error.response?.data?.errors
      ? error.response.data.errors.map(e => e.message).join('; ')
      : error.message || 'Unknown error';
    throw new Error(`Failed to find company: ${errorMessage}`);
  }
}

/**
 * Test linking a person (direct GraphQL)
 */
async function testLinkPerson(personId) {
  try {
    // Get person details by ID using filter
    const GET_PERSON_QUERY = `
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
    `;

    const personResponse = await axios.post(
      GRAPHQL_URL,
      {
        query: GET_PERSON_QUERY,
        variables: { id: personId },
      },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (personResponse.data.errors) {
      throw new Error(personResponse.data.errors.map(e => e.message).join('; '));
    }

    const edges = personResponse.data.data?.people?.edges || [];
    if (edges.length === 0) {
      return { success: false, error: 'Person not found' };
    }

    const person = edges[0].node;

    if (person.company?.id) {
      return { success: true, skipped: true, message: 'Already linked', company: person.company };
    }

    const personDomain = person.domain;
    if (!personDomain) {
      return { success: false, error: 'Person has no domain field' };
    }

    // Find company
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

    const companyResponse = await axios.post(
      GRAPHQL_URL,
      {
        query: FIND_COMPANY_QUERY,
        variables: { domain: personDomain.toLowerCase().trim() },
      },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (companyResponse.data.errors) {
      throw new Error(companyResponse.data.errors.map(e => e.message).join('; '));
    }

    const companyEdges = companyResponse.data.data?.companies?.edges || [];
    if (companyEdges.length === 0) {
      return { success: false, error: `No company found with domain: ${personDomain}` };
    }

    const company = companyEdges[0].node;

    // Link person to company
    const UPDATE_MUTATION = `
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

    const linkResponse = await axios.post(
      GRAPHQL_URL,
      {
        query: UPDATE_MUTATION,
        variables: { id: personId, companyId: company.id },
      },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (linkResponse.data.errors) {
      throw new Error(linkResponse.data.errors.map(e => e.message).join('; '));
    }

    return {
      success: true,
      data: {
        personId,
        companyId: company.id,
        companyName: company.name,
        domain: personDomain,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.errors
        ? error.response.data.errors.map(e => e.message).join('; ')
        : error.message || 'Unknown error',
    };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('='.repeat(60));
  console.log(`Testing Linking System for Domain: ${TEST_DOMAIN}`);
  console.log('='.repeat(60));
  console.log(`GraphQL URL: ${GRAPHQL_URL}`);
  console.log(`Linking: Direct GraphQL (no local API needed)\n`);

  if (!TWENTY_SERVER_URL || !TWENTY_API_KEY) {
    console.error('Error: TWENTY_SERVER_URL and TWENTY_API_KEY must be set in .env file');
    process.exit(1);
  }

  try {
    // Step 1: Find company with btn.co.id domain
    console.log('Step 1: Looking for company with domain "btn.co.id"...');
    const company = await findCompanyByDomain(TEST_DOMAIN);
    
    if (!company) {
      console.log('❌ No company found with domain "btn.co.id"');
      console.log('\nPlease ensure:');
      console.log('  1. A company exists with domain "btn.co.id"');
      console.log('  2. The company has the domain text field populated');
      console.log('  3. Run populate_company_domain_text.mjs if needed');
      process.exit(1);
    }

    console.log(`✅ Found company: ${company.name} (ID: ${company.id})`);
    console.log(`   Domain Link: ${company.domain || 'N/A'}\n`);
    
    // Extract normalized domain for display
    if (company.domain) {
      let extractedDomain = company.domain;
      extractedDomain = extractedDomain.replace(/^https?:\/\//i, '');
      extractedDomain = extractedDomain.replace(/^www\./i, '');
      extractedDomain = extractedDomain.split('/')[0].split(':')[0];
      console.log(`   Extracted Domain: ${extractedDomain}\n`);
    }

    // Step 2: Find people with btn.co.id domain
    console.log('Step 2: Looking for people with domain "btn.co.id"...');
    const people = await findPeopleWithDomain(TEST_DOMAIN, 5);

    if (people.length === 0) {
      console.log('❌ No people found with domain "btn.co.id"');
      process.exit(1);
    }

    console.log(`✅ Found ${people.length} people with domain "btn.co.id":\n`);
    
    people.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      const currentCompany = person.company?.name || 'Not linked';
      console.log(`  ${index + 1}. ${email}`);
      console.log(`     Person ID: ${person.id}`);
      console.log(`     Current Company: ${currentCompany}`);
      console.log(`     Domain Field: ${person.domain || 'N/A'}\n`);
    });

    // Step 3: Test linking first person
    console.log('Step 3: Testing link for first person...');
    const testPerson = people[0];
    const email = testPerson.emails?.primaryEmail || 'N/A';
    
    console.log(`   Testing: ${email} (${testPerson.id})`);
    
    const linkResult = await testLinkPerson(testPerson.id);
    
    if (linkResult.success) {
      if (linkResult.skipped) {
        console.log('   ⏭️  Already linked (skipped)');
        console.log(`   Company: ${linkResult.company?.name || 'N/A'}`);
      } else {
        console.log('   ✅ Link successful!');
        console.log(`   Linked to: ${linkResult.data?.companyName || 'N/A'}`);
        console.log(`   Company ID: ${linkResult.data?.companyId || 'N/A'}`);
      }
    } else {
      console.log('   ❌ Link failed!');
      console.log(`   Error: ${linkResult.error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nTo link all people, run:`);
    console.log(`  node link_all_people_in_batches.mjs`);

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run test
main().catch(error => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});

