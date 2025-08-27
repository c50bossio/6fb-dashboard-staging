// Inspect the 200 responses to understand what's being returned
const fetch = require('node-fetch');
const fs = require('fs').promises;

async function inspect200Responses() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';

  const workingEndpoints = [
    '/products?limit=1',
    '/customers?limit=1', 
    '/stock?limit=1',
    '/accountbank?limit=1&page=1'
  ];
  
  for (const endpoint of workingEndpoints) {
    
    );
    
    const url = `https://inventory.dearsystems.com/ExternalAPI/v2${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; CIN7-Integration/1.0)'
        }
      });

      }`);
      
      if (response.status === 200) {
        const text = await response.text();

        }`);
        
        // Check if it's JSON but with HTML wrapper
        if (text.includes('{') && text.includes('}')) {

          // Try to extract JSON from HTML
          const jsonMatches = text.match(/\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}/g);
          if (jsonMatches) {
            for (let i = 0; i < jsonMatches.length && i < 3; i++) {
              try {
                const parsed = JSON.parse(jsonMatches[i]);
                
                .substring(0, 300));
              } catch (e) {
                }`);
              }
            }
          }
        }
        
        // Save response to file for manual inspection
        const filename = `response_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
        await fs.writeFile(filename, text);

        // Check for specific patterns
        if (text.includes('Login')) {
          
        }
        if (text.includes('error')) {
          
        }
        if (text.includes('unauthorized')) {
          
        }
        if (text.includes('forbidden')) {
          
        }
        if (text.includes('API')) {
          
        }
      }
      
    } catch (error) {
      
    }
  }

  // Test with different content-type

  const acceptHeaders = [
    'application/json',
    'application/json, text/html',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '*/*'
  ];
  
  for (const accept of acceptHeaders) {

    try {
      const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?limit=1', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Accept': accept
        }
      });

      }`);
      
      if (response.status === 200) {
        const text = await response.text();
        
        // Check if this Accept header gives us JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          
          try {
            const data = JSON.parse(text);
            .substring(0, 200)}`);
          } catch (e) {
            
          }
        } else {
          }`);
        }
      }
      
    } catch (error) {
      
    }
  }

}

inspect200Responses();