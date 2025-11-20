import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWENTY_SERVER_URL = process.env.TWENTY_SERVER_URL || process.env.TWENTY_BASE_URL || '';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || '';
const GRAPHQL_URL = `${TWENTY_SERVER_URL}/graphql`;

// Try different queries to find the Btn company
const queries = [
  {
    name: 'Find by name "Btn"',
    query: `
      query FindBtnCompany {
        companies(limit: 100, filter: { name: { eq: "Btn" } }) {
          edges {
            node {
              id
              name
              domain
            }
          }
        }
      }
    `
  },
  {
    name: 'Find by name containing "btn" (case insensitive)',
    query: `
      query FindBtnCompany {
        companies(limit: 100, filter: { name: { ilike: "%btn%" } }) {
          edges {
            node {
              id
              name
              domain
            }
          }
        }
      }
    `
  },
  {
    name: 'Find by domain "btn.co.id"',
    query: `
      query FindBtnCompany {
        companies(limit: 100, filter: { domain: { eq: "btn.co.id" } }) {
          edges {
            node {
              id
              name
              domain
            }
          }
        }
      }
    `
  },
  {
    name: 'Get all companies and search manually',
    query: `
      query GetAllCompanies {
        companies(limit: 10000) {
          edges {
            node {
              id
              name
              domain
            }
          }
        }
      }
    `
  }
];

async function runQuery(queryObj) {
  try {
    console.log(`\nTrying: ${queryObj.name}`);
    const response = await axios.post(
      GRAPHQL_URL,
      { query: queryObj.query },
      {
        headers: {
          'Authorization': `Bearer ${TWENTY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data.errors) {
      console.log(`   ❌ Error: ${response.data.errors.map(e => e.message).join('; ')}`);
      return null;
    }

    const edges = response.data.data?.companies?.edges || [];
    console.log(`   Found ${edges.length} companies`);
    
    // Look for Btn company
    const btnCompany = edges
      .map(e => e.node)
      .find(c => c.name && c.name.toLowerCase().includes('btn'));
    
    if (btnCompany) {
      console.log(`   ✅ Found: ${btnCompany.name}`);
      console.log(`      ID: ${btnCompany.id}`);
      console.log(`      Domain: ${btnCompany.domain || 'NOT SET'}`);
      return btnCompany;
    }
    
    // Also check for domain btn.co.id
    const domainMatch = edges
      .map(e => e.node)
      .find(c => {
        if (!c.domain) return false;
        const domain = c.domain.toLowerCase().trim();
        return domain === 'btn.co.id' || domain.includes('btn.co.id');
      });
    
    if (domainMatch) {
      console.log(`   ✅ Found by domain: ${domainMatch.name}`);
      console.log(`      ID: ${domainMatch.id}`);
      console.log(`      Domain: ${domainMatch.domain}`);
      return domainMatch;
    }
    
    return null;
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Debug: Finding Btn Company');
  console.log('='.repeat(60));

  for (const queryObj of queries) {
    const result = await runQuery(queryObj);
    if (result) {
      console.log('\n' + '='.repeat(60));
      console.log('SUCCESS! Found the company:');
      console.log(JSON.stringify(result, null, 2));
      return;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Could not find Btn company with any query method');
  console.log('='.repeat(60));
}

main();


