import { loadStripe } from '@stripe/stripe-js';

// This is your Stripe publishable key (safe to expose)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export { stripePromise };