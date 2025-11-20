import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

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

const LINK_PERSON_MUTATION = `
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

async function linkPersonToCompany(personId, companyId) {
  const response = await axios.post(
    GRAPHQL_URL,
    {
      query: LINK_PERSON_MUTATION,
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
}

async function main() {
  const domain = 'btn.co.id';
  
  console.log('='.repeat(60));
  console.log(`Linking People with Domain: ${domain}`);
  console.log('='.repeat(60));

  // Find people
  console.log(`\n1. Finding people with domain "${domain}"...`);
  const peopleResponse = await axios.post(
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

  if (peopleResponse.data.errors) {
    throw new Error(peopleResponse.data.errors.map(e => e.message).join('; '));
  }

  const peopleEdges = peopleResponse.data.data?.people?.edges || [];
  const people = peopleEdges.map(edge => edge.node);
  console.log(`   Found ${people.length} people`);

  // Find company
  console.log(`\n2. Finding company with domain "${domain}"...`);
  const companyResponse = await axios.post(
    GRAPHQL_URL,
    {
      query: FIND_COMPANY_QUERY,
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

  if (companyResponse.data.errors) {
    throw new Error(companyResponse.data.errors.map(e => e.message).join('; '));
  }

  const companyEdges = companyResponse.data.data?.companies?.edges || [];
  if (companyEdges.length === 0) {
    throw new Error(`No company found with domain: ${domain}`);
  }

  const company = companyEdges[0].node;
  console.log(`   Found company: ${company.name} (ID: ${company.id})`);

  // Filter people that need linking
  const peopleToLink = people.filter(p => !p.company?.id);
  console.log(`\n3. People to link: ${peopleToLink.length}`);
  
  if (peopleToLink.length === 0) {
    console.log('   All people are already linked!');
    return;
  }

  // Link each person
  console.log(`\n4. Linking people...`);
  let success = 0;
  let failed = 0;

  for (const person of peopleToLink) {
    const email = person.emails?.primaryEmail || 'N/A';
    try {
      await linkPersonToCompany(person.id, company.id);
      console.log(`   ✅ Linked: ${email}`);
      success++;
    } catch (error) {
      console.log(`   ❌ Failed: ${email} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n` + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total people found: ${people.length}`);
  console.log(`Already linked: ${people.length - peopleToLink.length}`);
  console.log(`Successfully linked: ${success}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);


