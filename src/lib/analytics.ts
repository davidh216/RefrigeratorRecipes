import mixpanel from 'mixpanel-browser';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Initialize analytics based on environment
const initializeAnalytics = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
  
  if (!enableAnalytics) {
    console.log('Analytics disabled');
    return;
  }

  // Initialize Mixpanel
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
      debug: !isProduction,
      track_pageview: true,
      persistence: 'localStorage'
    });
  }

  // Initialize Google Analytics
  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    // Google Analytics 4
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });

    // Make gtag available globally
    (window as any).gtag = gtag;
  }

  // Initialize Web Vitals
  if (isProduction) {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  }
};

// Track page views
export const trackPageView = (url: string, title?: string) => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;

  // Mixpanel
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    mixpanel.track('Page View', {
      url,
      title: title || document.title,
      timestamp: new Date().toISOString()
    });
  }

  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_title: title || document.title,
      page_location: url,
    });
  }
};

// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;

  // Mixpanel
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    mixpanel.track(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT
    });
  }

  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      event_category: 'user_interaction',
      event_label: properties?.label || eventName,
      value: properties?.value,
      ...properties
    });
  }
};

// Track user identification
export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;

  // Mixpanel
  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    mixpanel.identify(userId);
    if (userProperties) {
      mixpanel.people.set(userProperties);
    }
  }

  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      user_id: userId
    });
  }
};

// Track recipe interactions
export const trackRecipeInteraction = (action: string, recipeId: string, recipeName?: string) => {
  trackEvent('Recipe Interaction', {
    action,
    recipe_id: recipeId,
    recipe_name: recipeName,
    category: 'recipe'
  });
};

// Track ingredient interactions
export const trackIngredientInteraction = (action: string, ingredientId: string, ingredientName?: string) => {
  trackEvent('Ingredient Interaction', {
    action,
    ingredient_id: ingredientId,
    ingredient_name: ingredientName,
    category: 'ingredient'
  });
};

// Track meal planning interactions
export const trackMealPlanningInteraction = (action: string, details?: Record<string, any>) => {
  trackEvent('Meal Planning Interaction', {
    action,
    category: 'meal_planning',
    ...details
  });
};

// Track shopping list interactions
export const trackShoppingListInteraction = (action: string, details?: Record<string, any>) => {
  trackEvent('Shopping List Interaction', {
    action,
    category: 'shopping_list',
    ...details
  });
};

// Initialize analytics when module is imported
if (typeof window !== 'undefined') {
  initializeAnalytics();
}

export default {
  trackPageView,
  trackEvent,
  identifyUser,
  trackRecipeInteraction,
  trackIngredientInteraction,
  trackMealPlanningInteraction,
  trackShoppingListInteraction
};
