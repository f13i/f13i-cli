const axios = require('axios');

// Call Granola API to fetch meetings
async function granolaSearch(params) {
  // params: { folder, dateRange, query }
  
  try {
    const response = await axios.get('https://api.granola.ai/meetings', {
      headers: {
        'Authorization': `Bearer ${process.env.GRANOLA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        folder: params.folder || 'f13i',
        limit: params.limit || 50,
        ...params
      }
    });
    
    return response.data.meetings || [];
  } catch (error) {
    console.error('Granola API error:', error.message);
    return [];
  }
}

// Call PricingSaaS API to fetch pricing page
async function pricingSaasFetch(company) {
  // company: { name, domain }
  
  try {
    const response = await axios.get(`https://api.pricingsaas.com/company/${company.domain}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRICINGSAAS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('PricingSaaS API error:', error.message);
    return null;
  }
}

// Parse a company from a URL
function parseCompanyDomain(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return null;
  }
}

module.exports = {
  granolaSearch,
  pricingSaasFetch,
  parseCompanyDomain
};
