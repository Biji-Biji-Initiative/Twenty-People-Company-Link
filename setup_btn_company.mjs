import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

const COMPANY_NAME = 'Bank Tabungan Negara (BTN)';
const COMPANY_DOMAIN = 'btn.co.id';
const COMPANY_DOMAIN_LINK = `https://${COMPANY_DOMAIN}`;

// Create company mutation
const CREATE_COMPANY_MUTATION = `
  mutation CreateCompany($data: CompanyCreateInput!) {
    createCompany(data: $data) {
      id
      name
      domain
    }
  }
`;

// Find company by name
const FIND_COMPANY_QUERY = `
  query FindCompany($name: String!) {
    companies(limit: 10, filter: { name: { eq: $name } }) {
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

async function findOrCreateCompany() {
  // First, try to find existing company
  const findResponse = await axios.post(
    GRAPHQL_URL,
    {
      query: FIND_COMPANY_QUERY,
      variables: { name: COMPANY_NAME },
    },
    {
      headers: {
        'Authorization': `Bearer ${TWENTY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (findResponse.data.data?.companies?.edges?.length > 0) {
    const company = findResponse.data.data.companies.edges[0].node;
    console.log(`✅ Found existing company: ${company.name} (ID: ${company.id})`);
    
    if (!company.domain) {
      console.log(`   Domain not set. You can update it manually in Twenty CRM.`);
      console.log(`   Suggested domain: ${COMPANY_DOMAIN_LINK}`);
    } else {
      console.log(`   Domain: ${company.domain}`);
    }
    
    return company;
  }

  // Create new company
  console.log(`Creating new company: ${COMPANY_NAME}...`);
  
  const createResponse = await axios.post(
    GRAPHQL_URL,
    {
      query: CREATE_COMPANY_MUTATION,
      variables: {
        data: {
          name: COMPANY_NAME,
          domain: COMPANY_DOMAIN_LINK,
        },
      },
    },
    {
      headers: {
        'Authorization': `Bearer ${TWENTY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (createResponse.data.errors) {
    throw new Error(createResponse.data.errors.map(e => e.message).join('; '));
  }

  const company = createResponse.data.data?.createCompany;
  if (company) {
    console.log(`✅ Created company: ${company.name} (ID: ${company.id})`);
    console.log(`   Domain: ${company.domain || COMPANY_DOMAIN_LINK}`);
    return company;
  }

  throw new Error('Failed to create company');
}

async function main() {
  console.log('='.repeat(60));
  console.log('Setting up BTN Company');
  console.log('='.repeat(60));
  console.log(`Company Name: ${COMPANY_NAME}`);
  console.log(`Domain: ${COMPANY_DOMAIN}`);
  console.log(`GraphQL URL: ${GRAPHQL_URL}\n`);

  try {
    const company = await findOrCreateCompany();
    
    console.log('\n' + '='.repeat(60));
    console.log('NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('1. Import people with @btn.co.id emails into Twenty CRM');
    console.log('2. Run: node populate_company_domain_text.mjs (if you created domain text field)');
    console.log('3. Run: node test_btn_linking.mjs (to test linking)');
    console.log('4. Run: node link_all_people_in_batches.mjs (to link all people)');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();


