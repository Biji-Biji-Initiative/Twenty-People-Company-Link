import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

const GET_ALL_PEOPLE_QUERY = `
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

async function getAllPeople() {
  const response = await axios.post(
    GRAPHQL_URL,
    {
      query: GET_ALL_PEOPLE_QUERY,
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
  console.log('Finding All People with Domain Fields');
  console.log('='.repeat(60));
  console.log(`GraphQL URL: ${GRAPHQL_URL}\n`);

  const allPeople = await getAllPeople();
  console.log(`Total people in system: ${allPeople.length}\n`);

  const peopleWithDomain = allPeople.filter(p => p.domain && p.domain.trim());
  const peopleWithoutDomain = allPeople.filter(p => !p.domain || !p.domain.trim());
  const peopleNotLinked = peopleWithDomain.filter(p => !p.company?.id);
  const peopleLinked = peopleWithDomain.filter(p => p.company?.id);

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total people: ${allPeople.length}`);
  console.log(`People WITH domain field: ${peopleWithDomain.length}`);
  console.log(`People WITHOUT domain field: ${peopleWithoutDomain.length}`);
  console.log(`People with domain but NOT linked: ${peopleNotLinked.length}`);
  console.log(`People with domain and linked: ${peopleLinked.length}\n`);

  if (peopleNotLinked.length > 0) {
    console.log('='.repeat(60));
    console.log('PEOPLE WITH DOMAIN BUT NOT LINKED:');
    console.log('='.repeat(60));
    peopleNotLinked.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      console.log(`${index + 1}. ${email}`);
      console.log(`   Person ID: ${person.id}`);
      console.log(`   Domain: ${person.domain}`);
      console.log(`   Company: Not linked\n`);
    });
  }

  // Debug: Show first few people to see what fields are available
  console.log('='.repeat(60));
  console.log('DEBUG: First 3 people (showing all fields):');
  console.log('='.repeat(60));
  allPeople.slice(0, 3).forEach((person, index) => {
    console.log(`\nPerson ${index + 1}:`);
    console.log(JSON.stringify(person, null, 2));
  });

  // Also try to find people by filtering for domain
  console.log('\n' + '='.repeat(60));
  console.log('Trying to find people with domain using filter...');
  console.log('='.repeat(60));
  
  const FILTER_QUERY = `
    query FindPeopleWithDomain {
      people(limit: 1000, filter: { domain: { isNotNull: true } }) {
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
    const filterResponse = await axios.post(
      GRAPHQL_URL,
      { query: FILTER_QUERY },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (filterResponse.data.errors) {
      console.log(`Filter query error: ${filterResponse.data.errors.map(e => e.message).join('; ')}`);
    } else {
      const filteredEdges = filterResponse.data.data?.people?.edges || [];
      const filteredPeople = filteredEdges.map(edge => edge.node);
      console.log(`Found ${filteredPeople.length} people with domain field using filter`);
      
      if (filteredPeople.length > 0) {
        console.log('\nPeople with domain (from filter):');
        filteredPeople.forEach((person, index) => {
          const email = person.emails?.primaryEmail || 'N/A';
          const company = person.company?.name || 'Not linked';
          console.log(`${index + 1}. ${email} | Domain: ${person.domain} | Company: ${company}`);
        });
      }
    }
  } catch (error) {
    console.log(`Error with filter query: ${error.message}`);
  }

  if (peopleWithDomain.length > 0) {
    console.log('='.repeat(60));
    console.log('ALL PEOPLE WITH DOMAIN FIELD:');
    console.log('='.repeat(60));
    peopleWithDomain.forEach((person, index) => {
      const email = person.emails?.primaryEmail || 'N/A';
      const company = person.company?.name || 'Not linked';
      console.log(`${index + 1}. ${email} | Domain: ${person.domain} | Company: ${company}`);
    });
  }
}

main().catch(console.error);

