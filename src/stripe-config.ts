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
    id: 'prod_Sk0aNiMimbxyy8',
    priceId: 'price_1RoWZGPhcFyuM9RIB6syfWBB',
    name: 'SAAS test',
    description: 'Premium subscription plan with advanced features',
    mode: 'subscription',
    price: '$9.99/month'
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}