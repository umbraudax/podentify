export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SkKGgTb6PmM6aI',
    priceId: 'price_PLACEHOLDER_UPDATE_WITH_REAL_PRICE_ID',
    name: 'Podtentify Pro',
    description: 'Premium subscription plan with unlimited episodes, AI-generated show notes, social media clips, and priority processing.',
    mode: 'subscription',
    price: '$30.00/month'
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}