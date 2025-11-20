import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

async function listCompanies() {
  const query = `
    query ListCompanies($limit: Int!) {
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

  const response = await axios.post(
    GRAPHQL_URL,
    { query, variables: { limit: 1000 } },
    {
      headers: {
        'Authorization': `Bearer ${TWENTY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data?.companies?.edges || [];
}

async function listPeopleWithDomain(domain) {
  const query = `
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
  `;

  const response = await axios.post(
    GRAPHQL_URL,
    { query, variables: { limit: 5000 } }, // Increased limit
    {
      headers: {
        'Authorization': `Bearer ${TWENTY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const edges = response.data.data?.people?.edges || [];
  const normalizedDomain = domain.toLowerCase().trim();
  
  const matching = edges
    .map(edge => edge.node)
    .filter(person => {
      const email = person.emails?.primaryEmail;
      if (!email) return false;
      const emailDomain = email.split('@')[1]?.toLowerCase().trim();
      const personDomain = person.domain?.toLowerCase().trim();
      
      // Check both email domain and person's domain field
      return emailDomain === normalizedDomain || personDomain === normalizedDomain;
    });
  
  console.log(`\nSearched through ${edges.length} people total`);
  return matching;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Listing Companies and People');
  console.log('='.repeat(60));
  console.log(`GraphQL URL: ${GRAPHQL_URL}\n`);

  // List all companies
  console.log('COMPANIES:');
  console.log('-'.repeat(60));
  const companies = await listCompanies();
  console.log(`Found ${companies.length} companies:\n`);
  
  companies.forEach((edge, index) => {
    const company = edge.node;
    console.log(`${index + 1}. ${company.name}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Domain: ${company.domain || 'N/A'}`);
    if (company.domain) {
      let extracted = company.domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0];
      console.log(`   Extracted: ${extracted}`);
    }
    console.log('');
  });

  // List people with btn.co.id
  console.log('\n' + '='.repeat(60));
  console.log('PEOPLE WITH DOMAIN "btn.co.id":');
  console.log('-'.repeat(60));
  const people = await listPeopleWithDomain('btn.co.id');
  console.log(`Found ${people.length} people:\n`);
  
  if (people.length === 0) {
    console.log('No people found with domain "btn.co.id"');
  } else {
    people.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      const company = person.company?.name || 'Not linked';
      console.log(`${index + 1}. ${email}`);
      console.log(`   Person ID: ${person.id}`);
      console.log(`   Domain Field: ${person.domain || 'N/A'}`);
      console.log(`   Current Company: ${company}`);
      console.log('');
    });
  }
}

main().catch(console.error);

