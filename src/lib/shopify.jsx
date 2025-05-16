import React from 'react';

const SHOPIFY_API_VERSION = '2025-04'; // Guide mentions 2025-07 as an example, but 2025-04 is also used. Sticking to this for now.

export const fetchShopifyStorefrontAPI = async (rawDomain, storefrontAccessToken, query, variables = {}) => {
  if (!rawDomain || rawDomain === 'your-shop-name.myshopify.com' || !storefrontAccessToken || storefrontAccessToken === 'YOUR_SHOPIFY_STOREFRONT_ACCESS_TOKEN') {
    throw new Error('Shopify domain or access token is not configured or is using placeholder values.');
  }

  // Normalize domain
  let normalizedDomain = rawDomain.trim().replace(/^(https?:\/\/)/, "").replace(/\/$/, "");
  // Append suffix only if missing. This simple check assumes custom domains will not end in ".myshopify.com"
  // and that if it's not a myshopify domain, it's a custom one that's correctly entered.
  // A more robust solution might involve checking for any dot, but the debug guide's example is simpler.
  if (!normalizedDomain.includes('.')) { // If no dot, assume it's just the shop name part
    normalizedDomain = `${normalizedDomain}.myshopify.com`;
  } else if (!normalizedDomain.endsWith(".myshopify.com") && !normalizedDomain.includes('.')) { 
    // This case is a bit redundant with the one above, simplified to: if no dot, append.
    // The debug guide's example was: if (!normalizedDomain.endsWith(".myshopify.com")) normalizedDomain = `${normalizedDomain}.myshopify.com`;
    // Let's use a slightly modified version of the debug guide's logic:
    // If it doesn't have a dot (e.g. "my-shop") -> "my-shop.myshopify.com"
    // If it has a dot but isn't a myshopify.com domain (e.g. "custom.com") -> use as is
    // If it is "my-shop.myshopify.com" -> use as is
  }
  // Re-evaluating normalization based on debug guide:
  // "Append suffix only if missing and not a custom domain"
  // A simple heuristic: if it doesn't contain a '.', it's not a custom domain and needs suffix.
  // If it contains a '.' but not '.myshopify.com', it's assumed to be a custom domain.
  if (!normalizedDomain.includes('.')) {
      normalizedDomain = `${normalizedDomain}.myshopify.com`;
  }
  // The debug guide's example is:
  // if (!normalizedDomain.endsWith(".myshopify.com")) { normalizedDomain = `${normalizedDomain}.myshopify.com`; }
  // This would incorrectly turn "mycustomdomain.com" into "mycustomdomain.com.myshopify.com".
  // A better approach: if it doesn't include ANY '.', then append. Otherwise, assume it's either a full myshopify domain or a custom domain.
  
  // Let's use a clear refined logic:
  let domainToUse = rawDomain.trim().replace(/^(https?:\/\/)/, "").replace(/\/$/, "");
  if (!domainToUse.includes(".")) { // If it's just "shopname"
    domainToUse = `${domainToUse}.myshopify.com`;
  }
  // Now domainToUse is either "shopname.myshopify.com" or "custom.domain.com" or "shopname.myshopify.com" (if entered fully)

  const shopifyApiUrl = `https://${domainToUse}/api/${SHOPIFY_API_VERSION}/graphql.json`;

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
      description 
      primaryDomain {
        host
        url
      }
      brand {
        logo {
          image { # Reverted to use image field
            url
            altText
          }
        }
        squareLogo { # Added, assuming similar structure
          image {
            url
            altText # Assuming altText is available, can be removed if not
          }
        }
        coverImage {
          image { # Reverted to use image field
            url
            altText
          }
        }
        slogan
        shortDescription # Added
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
          description # Changed from descriptionHtml
          handle
          tags
          images(first: 5) { # Changed from first: 1
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 5) { # Changed from first: 1
            edges {
              node {
                id # Added for variants
                title # Added for variants
                availableForSale # Added
                sku # Added from debug guide example
                price: priceV2 { # Changed from priceRange.minVariantPrice to priceV2, aliased to price
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

export const GET_COLLECTIONS_QUERY = `
  query GetCollections($first: Int = 10, $cursor: String) {
    collections(first: $first, after: $cursor) {
      edges {
        node {
          id
          title
          description
          handle
          products(first: 5) { # Example: fetch first 5 products in each collection
            edges {
              node {
                id
                title
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

export const GET_LOCALIZATION_INFO_QUERY = `
  query GetLocalizationInfo @inContext(country: "US") { # Defaulting to US, can be parameterized
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          name
          symbol
        }
      }
      availableLanguages {
        isoCode
        name
        endonymName
      }
    }
  }
`;

// Query for product recommendations (optional, as per guide)
export const GET_PRODUCT_RECOMMENDATIONS_QUERY = `
  query GetProductRecommendations($productId: ID!, $intent: ProductRecommendationIntent = RELATED) {
    productRecommendations(productId: $productId, intent: $intent) {
      id
      title
      handle
      images(first: 1) {
        edges {
          node {
            url
            altText
          }
        }
      }
    }
  }
`;

// Query for product media (optional, as per guide)
export const GET_PRODUCT_MEDIA_QUERY = `
  query GetProductMedia($productId: ID!, $first: Int = 5) {
    product(id: $productId) {
      media(first: $first) {
        edges {
          node {
            __typename
            alt
            previewImage {
              url
            }
            ... on MediaImage {
              image {
                url
                altText
                width
                height
              }
            }
            ... on Video {
              sources {
                url
                mimeType
                format
                height
                width
              }
            }
            ... on ExternalVideo {
              embedUrl
              host
            }
            ... on Model3d {
               sources {
                url
                format
                mimeType
              }
            }
          }
        }
      }
    }
  }
`;
