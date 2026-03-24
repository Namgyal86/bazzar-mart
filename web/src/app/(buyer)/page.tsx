import { HeroSection } from '@/components/home/hero-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedProducts } from '@/components/home/featured-products';
import { DealsBanner } from '@/components/home/deals-banner';
import { TrendingProducts } from '@/components/home/trending-products';
import { WhyBazzar } from '@/components/home/why-bazzar';
import { AppDownloadBanner } from '@/components/home/app-download-banner';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoryGrid />
      <FeaturedProducts />
      <DealsBanner />
      <TrendingProducts />
      <WhyBazzar />
      <AppDownloadBanner />
    </>
  );
}
