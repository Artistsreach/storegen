// src/lib/bigcommerce.js

/**
 * Fetches store settings (name, logo) from BigCommerce Storefront GraphQL API.
 * @param {string} storeDomain - The BigCommerce store's domain (e.g., mystore.mybigcommerce.com).
 * @param {string} token - The BigCommerce Storefront API token.
 * @returns {Promise<object>} The store settings.
 * @throws {Error} If fetching fails or GraphQL returns errors.
 */
export async function fetchStoreSettings(storeDomain, token) {
  const query = `
    query StoreSettings {
      site {
        settings {
          storeName
          storeHash
          status
          logo {
            title
            image {
              url(width: 500)
              altText
            }
          }
        }
      }
    }
  `;

  if (typeof storeDomain !== 'string' || !storeDomain.trim()) {
    const err = new TypeError('Invalid or empty storeDomain provided to fetchStoreSettings.');
    console.error(err.message, { storeDomain });
    throw err;
  }
  if (typeof token !== 'string' || !token.trim()) {
    const err = new TypeError('Invalid or empty token provided to fetchStoreSettings.');
    console.error(err.message, { tokenProvided: typeof token === 'string' && token.length > 0 ? 'Yes' : 'No' });
    throw err;
  }

  const graphqlUrl = `https://${storeDomain}/graphql`;
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  };

  console.log(`[fetchStoreSettings] Attempting to fetch: ${graphqlUrl}`, { domain: storeDomain, tokenProvided: !!token, queryLength: query.length });
  // console.log("[fetchStoreSettings] Fetch options:", JSON.stringify(fetchOptions, null, 2)); // Be careful logging tokens

  try {
    let res;
    try {
      res = await fetch(graphqlUrl, fetchOptions);
    } catch (networkError) {
      console.error(`[fetchStoreSettings] Initial fetch to ${graphqlUrl} failed:`, networkError);
      let detailedMessage = `Initial fetch to ${graphqlUrl} failed.`;
      if (networkError.name === 'TypeError') {
        // TypeError from fetch often indicates CORS, DNS, or other network-level failures.
        // The browser console's Network tab will have more specific details.
        detailedMessage += ` This is often due to a CORS misconfiguration (check 'allowed_cors_origins' for your BigCommerce Storefront API token), a DNS issue, or the server not being reachable. Please check the browser's Network DevTools for more specific error messages. Original error: ${networkError.message}`;
      } else {
        detailedMessage += ` Error: ${networkError.message || 'Unknown network error'}`;
      }
      throw new Error(detailedMessage);
    }

    console.log(`[fetchStoreSettings] Response from ${graphqlUrl} - Status: ${res.status}, Complexity: ${res.headers.get('X-Bc-GraphQL-Complexity')}`);

    if (!res.ok) {
      let errorBody = `Could not retrieve error body (status: ${res.status}).`;
      try {
        errorBody = await res.text();
      } catch (e) {
        console.warn("Failed to read error response body:", e);
      }
      throw new Error(`HTTP error ${res.status} for ${graphqlUrl}: ${errorBody}`);
    }

    let jsonResponse;
    try {
      jsonResponse = await res.json();
    } catch (e) {
      // If .json() fails, try to get raw text to understand why
      let rawText = 'Could not retrieve raw response text after JSON parse failure.';
      try {
        // Note: Response body might have already been consumed or partially consumed.
        // This is a best-effort to get more info. A more robust way is to clone the response.
        // For now, we'll assume if .json() fails, the original res might not be readable again.
        // Let's re-fetch for raw text for debugging, this is not ideal for production.
        // This is a temporary measure for debugging.
        const tempRes = await fetch(graphqlUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, body: JSON.stringify({ query }) });
        rawText = await tempRes.text();

      } catch (fetchTextError) {
        console.warn("Failed to re-fetch for raw text:", fetchTextError);
      }
      console.error("Failed to parse JSON response from BigCommerce.", e, {graphqlUrl, rawTextPreview: rawText.substring(0,500)});
      throw new Error(`Failed to parse JSON response from ${graphqlUrl}. Preview: ${rawText.substring(0,200)}...`);
    }
    

    if (jsonResponse.errors) {
      console.error("BigCommerce GraphQL errors (fetchStoreSettings):", jsonResponse.errors, {graphqlUrl});
      throw new Error(`GraphQL error: ${jsonResponse.errors.map(e => e.message).join(', ')}`);
    }
    if (!jsonResponse.data || !jsonResponse.data.site || !jsonResponse.data.site.settings) {
        console.error("Invalid data structure in BigCommerce response (fetchStoreSettings):", jsonResponse.data, {graphqlUrl});
        throw new Error("Invalid data structure received from BigCommerce API for store settings.");
    }
    return jsonResponse.data.site.settings;
  } catch (error) { // This is the outermost catch
    // Log the error with more context if it's not already one of our specific, more descriptive errors
    if (!(error.message.startsWith('Invalid or empty storeDomain') || 
          error.message.startsWith('Invalid or empty token') || 
          error.message.startsWith('HTTP error') || 
          error.message.startsWith('GraphQL error') || 
          error.message.startsWith('Failed to parse JSON') ||
          error.message.startsWith('Network error'))) {
        console.error(`[fetchStoreSettings] Unexpected error for ${graphqlUrl}:`, error.name, error.message, error.stack, error);
    }
    throw error; // Re-throw to be handled by the caller, it should have a descriptive message now
  }
}

/**
 * Fetches all products from BigCommerce Storefront GraphQL API with pagination.
 * @param {string} storeDomain - The BigCommerce store's domain.
 * @param {string} token - The BigCommerce Storefront API token.
 * @returns {Promise<Array<object>>} An array of all product nodes.
 * @throws {Error} If fetching fails or GraphQL returns errors.
 */
export async function fetchAllProducts(storeDomain, token) {
  let allProducts = [];
  let cursor = null;
  let hasNextPage = true;

  if (typeof storeDomain !== 'string' || !storeDomain.trim()) {
    const err = new TypeError('Invalid or empty storeDomain provided to fetchAllProducts.');
    console.error(err.message, { storeDomain });
    throw err;
  }
  if (typeof token !== 'string' || !token.trim()) {
    const err = new TypeError('Invalid or empty token provided to fetchAllProducts.');
    console.error(err.message, { tokenProvided: typeof token === 'string' && token.length > 0 ? 'Yes' : 'No' });
    throw err;
  }
  
  const graphqlUrl = `https://${storeDomain}/graphql`;

  const productQuery = `
    query ProductsPage($first: Int!, $after: String) {
      site {
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              entityId
              name
              sku
              defaultImage {
                url(width: 800)
                altText
              }
              prices {
                price { value currencyCode }
                retailPrice { value currencyCode }
              }
            }
          }
        }
      }
    }
  `;
  
  console.log(`[fetchAllProducts] Starting to fetch products from: ${graphqlUrl}`, { domain: storeDomain, tokenProvided: !!token });

  try {
    let pageNum = 1;
    while (hasNextPage) {
      const variables = { first: 50, after: cursor };
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query: productQuery, variables }),
      };
      
      let res;
      try {
        res = await fetch(graphqlUrl, fetchOptions);
      } catch (networkError) {
        console.error(`[fetchAllProducts] Initial fetch (Page ${pageNum}) to ${graphqlUrl} failed:`, networkError);
        let detailedMessage = `Initial fetch (Page ${pageNum}) to ${graphqlUrl} failed.`;
         if (networkError.name === 'TypeError') {
            detailedMessage += ` This is often due to a CORS misconfiguration (check 'allowed_cors_origins' for your BigCommerce Storefront API token), a DNS issue, or the server not being reachable. Please check the browser's Network DevTools for more specific error messages. Original error: ${networkError.message}`;
        } else {
            detailedMessage += ` Error: ${networkError.message || 'Unknown network error'}`;
        }
        throw new Error(detailedMessage);
      }

      console.log(`[fetchAllProducts] Response (Page ${pageNum}) from ${graphqlUrl} - Status: ${res.status}, Complexity: ${res.headers.get('X-Bc-GraphQL-Complexity')}`);
      pageNum++;

      if (!res.ok) {
        let errorBody = `Could not retrieve error body (status: ${res.status}).`;
        try {
          errorBody = await res.text();
        } catch (e) {
            console.warn("[fetchAllProducts] Failed to read error response body:", e);
        }
        throw new Error(`HTTP error ${res.status} for ${graphqlUrl} (products): ${errorBody}`);
      }
      
      let result;
      try {
        result = await res.json();
      } catch (e) {
        let rawText = 'Could not retrieve raw response text after JSON parse failure (fetchAllProducts).';
         try {
            // Re-fetch for raw text (temporary for debugging)
            const tempRes = await fetch(graphqlUrl, fetchOptions);
            rawText = await tempRes.text();
         } catch (fetchTextError) { /* ignore */ }
        console.error("[fetchAllProducts] Failed to parse JSON response from BigCommerce.", e, {graphqlUrl, rawTextPreview: rawText.substring(0,500)});
        throw new Error(`Failed to parse JSON response from ${graphqlUrl} (products). Preview: ${rawText.substring(0,200)}...`);
      }

      if (result.errors) {
        console.error("[fetchAllProducts] BigCommerce GraphQL errors:", result.errors, {graphqlUrl});
        throw new Error(`GraphQL error (products): ${result.errors.map(e => e.message).join(', ')}`);
      }

      const productsData = result.data?.site?.products;
      if (!productsData || !productsData.edges || !productsData.pageInfo) {
        console.error("[fetchAllProducts] Invalid data structure in BigCommerce response:", result.data, {graphqlUrl});
        throw new Error("Invalid data structure received from BigCommerce API for products.");
      }
      
      productsData.edges.forEach(edge => allProducts.push(edge.node));
      
      hasNextPage = productsData.pageInfo.hasNextPage;
      cursor = productsData.pageInfo.endCursor;
    }
    return allProducts;
  } catch (error) {
    if (!(error.message.startsWith('Invalid or empty storeDomain') || 
          error.message.startsWith('Invalid or empty token') || 
          error.message.startsWith('HTTP error') || 
          error.message.startsWith('GraphQL error') || 
          error.message.startsWith('Failed to parse JSON') ||
          error.message.startsWith('Network error'))) {
        console.error(`[fetchAllProducts] Unexpected error for ${graphqlUrl}:`, error.name, error.message, error.stack, error);
    }
    throw error;
  }
}

// Example usage (for testing, not for direct use in components without env vars)
/*
async function testBigCommerceFetch() {
  // IMPORTANT: Replace with your actual test credentials and domain
  // Never commit actual tokens or sensitive data to your repository.
  const BC_STORE_DOMAIN = process.env.VITE_BC_STORE_DOMAIN_TEST || 'your-store.mybigcommerce.com';
  const BC_STOREFRONT_TOKEN = process.env.VITE_BC_STOREFRONT_TOKEN_TEST || 'your-storefront-api-token';

  if (BC_STORE_DOMAIN === 'your-store.mybigcommerce.com' || BC_STOREFRONT_TOKEN === 'your-storefront-api-token') {
    console.warn("Using placeholder credentials for BigCommerce test. Please set up VITE_BC_STORE_DOMAIN_TEST and VITE_BC_STOREFRONT_TOKEN_TEST in your .env file for actual testing.");
    return;
  }

  try {
    console.log(`Fetching settings for ${BC_STORE_DOMAIN}...`);
    const settings = await fetchStoreSettings(BC_STORE_DOMAIN, BC_STOREFRONT_TOKEN);
    console.log("Store Name:", settings.storeName);
    console.log("Logo URL:", settings.logo?.image?.url || "No logo found");

    console.log("Fetching products...");
    const products = await fetchAllProducts(BC_STORE_DOMAIN, BC_STOREFRONT_TOKEN);
    console.log(`Fetched ${products.length} products.`);
    if (products.length > 0) {
      console.log("First product example:", products[0].name, products[0].prices?.price?.value);
    }
  } catch (error) {
    console.error("BigCommerce test fetch failed:", error.message);
  }
}

// To run the test:
// 1. Add VITE_BC_STORE_DOMAIN_TEST and VITE_BC_STOREFRONT_TOKEN_TEST to your .env file
// 2. Uncomment the line below and run your app or a script that imports this file.
// testBigCommerceFetch();
*/
