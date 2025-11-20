import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

// Try to find people by querying with different domain filters
const domainsToCheck = ['btn.co.id']; // Add more domains if needed

async function findPeopleByDomain(domain) {
  const query = `
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

  const response = await axios.post(
    GRAPHQL_URL,
    {
      query,
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
    console.log(`Error for domain ${domain}: ${response.data.errors.map(e => e.message).join('; ')}`);
    return [];
  }

  const edges = response.data.data?.people?.edges || [];
  return edges.map(edge => edge.node);
}

async function getAllPeople() {
  const query = `
    query GetAllPeople($limit: Int!) {
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

  const response = await axios.post(
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
  return edges.map(edge => edge.node);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Finding Missing People with Domain Fields');
  console.log('='.repeat(60));

  // Get all people
  console.log('\n1. Fetching all people...');
  const allPeople = await getAllPeople();
  console.log(`   Found ${allPeople.length} total people`);

  // Find people with btn.co.id using filter
  console.log('\n2. Finding people with domain "btn.co.id" using filter...');
  const btnPeople = await findPeopleByDomain('btn.co.id');
  console.log(`   Found ${btnPeople.length} people with btn.co.id domain`);

  if (btnPeople.length > 0) {
    console.log('\n   People with btn.co.id:');
    btnPeople.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      const company = person.company?.name || 'Not linked';
      console.log(`   ${index + 1}. ${email} | Company: ${company} | ID: ${person.id}`);
    });
  }

  // Check which ones are not in the allPeople list
  const btnPersonIds = new Set(btnPeople.map(p => p.id));
  const missingFromAll = btnPeople.filter(p => !allPeople.find(ap => ap.id === p.id));
  
  if (missingFromAll.length > 0) {
    console.log(`\n   ⚠️  ${missingFromAll.length} people found by filter but NOT in allPeople query:`);
    missingFromAll.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      console.log(`   ${index + 1}. ${email} (ID: ${person.id})`);
    });
  }

  // Check which btn people are not linked
  const btnNotLinked = btnPeople.filter(p => !p.company?.id);
  if (btnNotLinked.length > 0) {
    console.log(`\n   📋 ${btnNotLinked.length} people with btn.co.id that are NOT linked:`);
    btnNotLinked.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      console.log(`   ${index + 1}. ${email} (ID: ${person.id})`);
    });
  }

  // Also check all people for any with non-empty domain
  console.log('\n3. Checking all people for non-empty domain fields...');
  const peopleWithDomain = allPeople.filter(p => {
    const domain = p.domain;
    return domain && typeof domain === 'string' && domain.trim() && domain.trim() !== '';
  });
  console.log(`   Found ${peopleWithDomain.length} people with non-empty domain in allPeople query`);

  if (peopleWithDomain.length > 0) {
    console.log('\n   People with domain fields:');
    peopleWithDomain.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      const company = person.company?.name || 'Not linked';
      console.log(`   ${index + 1}. ${email} | Domain: ${person.domain} | Company: ${company}`);
    });
  }
}

main().catch(console.error);


