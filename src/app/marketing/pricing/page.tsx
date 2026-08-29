import { Metadata } from "next";
import { Pricing } from '@/components/landing/Pricing';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Pricing - Directly',
  description: 'Simple, honest pricing for Directly.',
};

export default function PricingPage() {
  return (
    <Suspense fallback={<div>Loading pricing...</div>}>
      <Pricing />
    </Suspense>
  );
}
