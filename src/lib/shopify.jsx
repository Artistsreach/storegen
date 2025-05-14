
import React from 'react';

const SHOPIFY_API_VERSION = '2025-04';

export const fetchShopifyStorefrontAPI = async (domain, storefrontAccessToken, query, variables = {}) => {
  if (!domain || domain === 'your-shop-name.myshopify.com' || !storefrontAccessToken || storefrontAccessToken === 'YOUR_SHOPIFY_STOREFRONT_ACCESS_TOKEN') {
    throw new Error('Shopify domain or access token is not configured or is using placeholder values.');
  }
  const shopifyApiUrl = `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`;

  try {
    const response = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        // Ignore if error body is not JSON
      }
      const errorMessage = errorBody?.errors?.[0]?.message || `Shopify API request failed: ${response.status} ${response.statusText}`;
      console.error('Shopify API Error:', errorBody || response.statusText);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    if (result.errors) {
      console.error('Shopify GraphQL Errors:', result.errors);
      throw new Error(result.errors.map(e => e.message).join(', '));
    }
    return result.data;
  } catch (error) {
    console.error('Error fetching from Shopify Storefront API:', error);
    throw error;
  }
};

export const GET_SHOP_METADATA_QUERY = `
  query GetShopMetadata {
    shop {
      name
      primaryDomain {
        host
        url
      }
      brand {
        logo {
          image {
            url
            altText
          }
        }
        slogan
        coverImage {
          image {
            url
            altText
          }
        }
        colors {
          primary {
            background
            foreground
          }
          secondary {
            background
            foreground
          }
        }
      }
    }
  }
`;

export const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int = 10, $cursor: String) {
    products(first: $first, after: $cursor) {
      edges {
        node {
          id
          title
          descriptionHtml
          handle
          tags
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                price {
                  amount
                  currencyCode
                }
                image {
                   url
                   altText
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
