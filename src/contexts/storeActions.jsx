
import React from 'react';
import { 
    fetchPexelsImages as utilFetchPexelsImages, 
    generateId as utilGenerateId, 
    generateAIProductDescriptions, 
    generateAIStoreContent 
} from '@/lib/utils';
import { 
    fetchShopifyStorefrontAPI, 
    GET_SHOP_METADATA_QUERY, 
    GET_PRODUCTS_QUERY 
} from '@/lib/shopify';

const getRandomColor = () => ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316'][Math.floor(Math.random() * 9)];
const getRandomFont = () => ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans'][Math.floor(Math.random() * 5)];
const getRandomLayout = () => ['grid', 'list'][Math.floor(Math.random() * 2)];


export const generateAIProductsData = async (type, count, storeName, storeLogoUrl, { fetchPexelsImages = utilFetchPexelsImages, generateId = utilGenerateId } = {}) => {
    const products = [];
    const priceRanges = { fashion: {min:20,max:200}, electronics: {min:50,max:1300}, food: {min:5,max:50}, jewelry: {min:100,max:1000}, general: {min:10,max:300} };
    const range = priceRanges[type] || priceRanges.general;
    const productNamesPool = {
      fashion: ['Classic Tee', 'Urban Jeans', 'Silk Scarf', 'Leather Boots', 'Summer Dress', 'Knit Sweater'],
      electronics: ['HD Webcam', 'Noise-Cancelling Buds', 'Smart Display', 'Gaming Pad', 'Portable Drive', 'VR Headset'],
      food: ['Artisan Bread', 'Gourmet Cheese', 'Organic Berries', 'Craft Coffee', 'Spiced Nuts', 'Dark Chocolate Bar'],
      jewelry: ['Pearl Necklace', 'Sapphire Ring', 'Gold Hoops', 'Charm Bracelet', 'Silver Cufflinks', 'Diamond Studs'],
      general: ['Utility Tool', 'Desk Organizer', 'Travel Mug', 'Yoga Mat', 'Scented Candle', 'Board Game']
    };
    const names = productNamesPool[type] || productNamesPool.general;
    const selectedNames = [...names].sort(() => 0.5 - Math.random()).slice(0, count);

    const imageQueries = selectedNames.map(name => `${type} ${name} product shot`);
    const productImages = await fetchPexelsImages(imageQueries.join(';'), count, 'square');

    for (let i = 0; i < count; i++) {
      const name = selectedNames[i];
      const image = productImages[i] || { id: generateId(), src: { medium: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(name)}` }, alt: `Placeholder for ${name}` };
      products.push({
        id: `product-ai-${generateId()}`,
        name,
        price: parseFloat((Math.random() * (range.max - range.min) + range.min).toFixed(2)),
        description: generateAIProductDescriptions(type, name),
        rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        stock: Math.floor(Math.random() * 80) + 20,
        image: image,
        logoUrl: storeLogoUrl,
        storeName: storeName,
      });
    }
    return products;
};


export const generateStoreFromWizardData = async (wizardData, { fetchPexelsImages = utilFetchPexelsImages, generateId = utilGenerateId } = {}) => {
    const storeId = `store-wizard-${generateId()}`;
    const { productType, storeName, logoUrl, products: wizardProducts, prompt } = wizardData;

    let finalProducts = [];
    if (wizardProducts.source === 'ai') {
      finalProducts = await generateAIProductsData(productType, wizardProducts.count, storeName, logoUrl, { fetchPexelsImages, generateId });
    } else if (wizardProducts.source === 'manual') {
      finalProducts = await Promise.all(wizardProducts.items.map(async p => {
        const pexelImages = await fetchPexelsImages(`${productType} ${p.name}`, 1, 'square');
        return {
          id: `product-manual-${generateId()}`,
          name: p.name,
          price: parseFloat(p.price),
          description: p.description || generateAIProductDescriptions(productType, p.name),
          image: pexelImages[0] || { src: { medium: `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(p.name)}` }, alt: p.name },
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          stock: Math.floor(Math.random() * 50) + 20,
          logoUrl: logoUrl, 
        };
      }));
    }
    
    const heroImages = await fetchPexelsImages(`${productType} store hero ${prompt}`, 1, 'landscape');
    const aiContent = generateAIStoreContent(productType, storeName);

    return {
      id: storeId,
      name: storeName,
      type: productType,
      description: aiContent.heroDescription,
      prompt: prompt || `A ${productType} store called ${storeName}`,
      products: finalProducts,
      hero_image: heroImages[0] || { src: { large: 'https://via.placeholder.com/1200x800.png?text=Hero+Image' }, alt: 'Placeholder Hero Image' },
      logo_url: logoUrl || `https://via.placeholder.com/100x100.png?text=${storeName.substring(0,1)}`,
      theme: {
        primaryColor: getRandomColor(),
        secondaryColor: getRandomColor(),
        fontFamily: getRandomFont(),
        layout: getRandomLayout(),
      },
      content: aiContent,
      data_source: 'wizard',
    };
};

export const generateStoreFromPromptData = async (prompt, { storeNameOverride = null, productTypeOverride = null, fetchPexelsImages = utilFetchPexelsImages, generateId = utilGenerateId } = {}) => {
    const storeId = `store-ai-${generateId()}`;
    const keywords = prompt.toLowerCase().split(' ');
    
    let storeType = productTypeOverride || 'general';
    if (!productTypeOverride) {
      if (keywords.some(word => ['clothing', 'fashion', 'apparel', 'wear'].includes(word))) storeType = 'fashion';
      else if (keywords.some(word => ['tech', 'electronics', 'gadget', 'digital'].includes(word))) storeType = 'electronics';
      else if (keywords.some(word => ['food', 'grocery', 'meal', 'organic'].includes(word))) storeType = 'food';
      else if (keywords.some(word => ['jewelry', 'accessory', 'watch', 'luxury'].includes(word))) storeType = 'jewelry';
    }
    
    const brandWords = prompt.split(' ').filter(word => word.charAt(0) === word.charAt(0).toUpperCase() && word.length > 2);
    const brandName = storeNameOverride || brandWords[0] || `${storeType.charAt(0).toUpperCase() + storeType.slice(1)} Store ${Math.floor(Math.random() * 100)}`;
    
    const products = await generateAIProductsData(storeType, 6, brandName, null, { fetchPexelsImages, generateId });
    const heroImages = await fetchPexelsImages(`${storeType} ${brandName} hero ${prompt}`, 1, 'landscape');
    const aiContent = generateAIStoreContent(storeType, brandName);
    
    return {
      id: storeId,
      name: brandName,
      type: storeType,
      description: aiContent.heroDescription,
      prompt,
      products,
      hero_image: heroImages[0] || { src: { large: 'https://via.placeholder.com/1200x800.png?text=Hero+Image' }, alt: 'Placeholder Hero Image' },
      logo_url: `https://via.placeholder.com/100x100.png?text=${brandName.substring(0,1)}`,
      theme: {
        primaryColor: getRandomColor(),
        secondaryColor: getRandomColor(),
        fontFamily: getRandomFont(),
        layout: getRandomLayout(),
      },
      content: aiContent,
      data_source: 'ai',
    };
};

export const importShopifyStoreData = async (domain, token, { fetchPexelsImages = utilFetchPexelsImages, generateId = utilGenerateId } = {}) => {
    const shopData = await fetchShopifyStorefrontAPI(domain, token, GET_SHOP_METADATA_QUERY);
    const productsData = await fetchShopifyStorefrontAPI(domain, token, GET_PRODUCTS_QUERY, { first: 10 });

    const shopifyStore = shopData.shop;
    const shopifyProducts = productsData.products.edges.map(edge => edge.node);

    const mappedProducts = shopifyProducts.map(p => ({
      id: p.id,
      name: p.title,
      description: p.descriptionHtml ? p.descriptionHtml.replace(/<[^>]*>?/gm, '').substring(0,150) + "..." : 'No description available.',
      price: parseFloat(p.variants.edges[0]?.node.price.amount || 0),
      currencyCode: p.variants.edges[0]?.node.price.currencyCode || 'USD',
      image: {
        id: p.images.edges[0]?.node.id || generateId(),
        src: { medium: p.images.edges[0]?.node.url || p.variants.edges[0]?.node.image?.url || `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(p.title)}` },
        alt: p.images.edges[0]?.node.altText || p.variants.edges[0]?.node.image?.altText || p.title,
      },
      tags: p.tags,
      rating: (Math.random() * 1.5 + 3.5).toFixed(1), 
      stock: Math.floor(Math.random() * 100) + 10, 
    }));
    
    const primaryColor = shopifyStore.brand?.colors?.primary?.[0]?.background || getRandomColor();
    const heroImage = {
        id: generateId(),
        src: { large: shopifyStore.brand?.coverImage?.image?.url || `https://via.placeholder.com/1200x800.png?text=${encodeURIComponent(shopifyStore.name)}` },
        alt: shopifyStore.brand?.coverImage?.image?.altText || shopifyStore.name,
    };
    const logoUrl = shopifyStore.brand?.logo?.image?.url || `https://via.placeholder.com/100x100.png?text=${shopifyStore.name.substring(0,1)}`;
    const aiContent = generateAIStoreContent('general', shopifyStore.name);

    return {
      id: `store-shopify-${shopifyStore.primaryDomain.host.replace(/\./g, '-')}-${generateId()}`,
      name: shopifyStore.name,
      type: 'shopify-imported',
      description: shopifyStore.brand?.slogan || aiContent.heroDescription,
      products: mappedProducts,
      hero_image: heroImage,
      logo_url: logoUrl,
      theme: {
        primaryColor: primaryColor,
        secondaryColor: shopifyStore.brand?.colors?.secondary?.[0]?.background || getRandomColor(),
        fontFamily: getRandomFont(), 
        layout: getRandomLayout(),
      },
      content: {
          ...aiContent,
          heroTitle: `Welcome to ${shopifyStore.name}`,
          heroDescription: shopifyStore.brand?.slogan || aiContent.heroDescription,
      },
      data_source: 'shopify',
      shopify_domain: domain, 
    };
};
