import HeroSection from '@/components/HeroSection'
import FeatureGrid from '@/components/FeatureGrid'
import Footer from '@/components/Footer'

function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-taro-light via-blush-light to-cream">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-matcha-light/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-taro/20 blur-3xl" />

      <HeroSection />
      <FeatureGrid />
      <Footer />
    </div>
  )
}

export default LandingPage
