export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: string;
  credits: number; // Monthly credit allocation
  features: string[];
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SkS5zZ9SsCntrC', // Pro product ID
    priceId: 'price_1RoxAsBKXSirmNWMGIXEqL8v', // Pro price ID
    name: 'Pro',
    description: 'Perfect for regular podcasters who need more transcription capacity and limited social media content.',
    mode: 'subscription',
    price: '$14.99/month',
    credits: 1460, // 1440 + 20 base = 1460 total monthly credits
    features: [
      '1,460 monthly transcript credits',
      'Chapter generation',
      'Limited social media content generation',
      'Priority processing',
      'Export transcripts'
    ]
  },
  {
    id: 'prod_SkS5ctXxhCUg6f', // Ultra product ID
    priceId: 'price_1RoxB8BKXSirmNWMja3Hs0eq', // Ultra price ID
    name: 'Ultra',
    description: 'For power users and professional podcasters who need maximum capacity and full social media features.',
    mode: 'subscription',
    price: '$29.99/month',
    credits: 3860, // 2400 + 1460 = 3860 total monthly credits
    features: [
      '3,860 monthly transcript credits',
      'Chapter generation',
      'Full access to social media content generation',
      'Priority processing',
      'Export transcripts',
      'Advanced AI features'
    ]
  }
];

// Free plan configuration (not in Stripe, handled locally)
export const freePlan = {
  name: 'Basic',
  credits: 20,
  features: [
    '20 monthly transcript credits',
    'Chapter generation only',
    'Basic support'
  ]
};

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

export function getPlanNameByPriceId(priceId: string): string {
  const product = getProductByPriceId(priceId);
  return product ? product.name : 'Basic';
}

export function getCreditsByPriceId(priceId: string): number {
  const product = getProductByPriceId(priceId);
  return product ? product.credits : freePlan.credits;
}