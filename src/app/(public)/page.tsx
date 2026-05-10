import { Metadata } from 'next';
import HeroSection from '@/components/home/HeroSection';
import LiveTrackingDemo from '@/components/home/LiveTrackingDemo';
import ServicesPreview from '@/components/home/ServicesPreview';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import HowItWorks from '@/components/home/HowItWorks';
import ImpactNumbers from '@/components/home/ImpactNumbers';
import AdvancedTechnology from '@/components/home/AdvancedTechnology';
import ShippingSolutions from '@/components/home/ShippingSolutions';
import TestimonialsSlider from '@/components/home/TestimonialsSlider';
import CertificationsSection from '@/components/home/CertificationsSection';
import FAQSection from '@/components/home/FAQSection';
import CTASection from '@/components/home/CTASection';
import { seoMetadata } from '@/content/seo-metadata';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: seoMetadata.home.title,
  description: seoMetadata.home.description,
  keywords: seoMetadata.home.keywords,
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const rawTestimonials = await prisma.testimonial.findMany({
    where: { status: 'published', published: true },
    select: {
      id: true,
      name: true,
      rating: true,
      body: true,
      verified: true,
      adminReply: true,
      adminReplyAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const testimonials = rawTestimonials.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    adminReplyAt: t.adminReplyAt?.toISOString() ?? null,
  }));

  return (
    <>
      {/* 1. Hero with tracking input + key metrics */}
      <HeroSection />
      {/* 2. Live tracking demo / journey visualization */}
      <LiveTrackingDemo />
      {/* 3. Service categories with images */}
      <ServicesPreview />
      {/* 4. Why Choose Us — 6 feature cards + driver image */}
      <WhyChooseUs />
      {/* 5. How It Works — 4 steps */}
      <HowItWorks />
      {/* 6. Impact numbers — 6 stats on dark bg */}
      <ImpactNumbers />
      {/* 7. Advanced Technology — 3 tech pillars */}
      <AdvancedTechnology />
      {/* 8. Shipping Solutions — 4 pricing cards */}
      <ShippingSolutions />
      {/* 9. Client testimonials + case studies */}
      <TestimonialsSlider testimonials={testimonials} />
      {/* 10. Certifications + trust section */}
      <CertificationsSection />
      {/* 11. FAQ accordion */}
      <FAQSection />
      {/* 12. CTA — Start Shipping Smarter Today */}
      <CTASection />
    </>
  );
}
