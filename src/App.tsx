import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { ToastProvider } from './components/Toasts'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { ErrorBoundary } from './components/ErrorBoundary'
import Home from './pages/Home'

const CompressPage = lazy(() => import('./pages/Compress'))
const ResizePage = lazy(() => import('./pages/Resize'))
const ConvertPage = lazy(() => import('./pages/Convert'))
const CropPage = lazy(() => import('./pages/Crop'))
const OptimizePage = lazy(() => import('./pages/Optimize'))
const MetadataRemoverPage = lazy(() => import('./pages/MetadataRemover'))
const SocialImagePage = lazy(() => import('./pages/SocialImage'))
const FaviconGeneratorPage = lazy(() => import('./pages/FaviconGenerator'))
const ColorExtractorPage = lazy(() => import('./pages/ColorExtractor'))
const ImageInfoPage = lazy(() => import('./pages/ImageInfo'))
const PrivacyPage = lazy(() => import('./pages/Privacy'))
const AboutPage = lazy(() => import('./pages/About'))
const NotFoundPage = lazy(() => import('./pages/NotFound'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RouteFallback() {
  return (
    <div className="shell flex min-h-[55vh] items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-accent"
      />
    </div>
  )
}

function AppFrame() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-medium focus:text-accent-ink"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/compress" element={<CompressPage />} />
            <Route path="/resize" element={<ResizePage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/crop" element={<CropPage />} />
            <Route path="/optimize" element={<OptimizePage />} />
            <Route path="/metadata-remover" element={<MetadataRemoverPage />} />
            <Route path="/social-media" element={<SocialImagePage />} />
            <Route path="/favicon-generator" element={<FaviconGeneratorPage />} />
            <Route path="/color-extractor" element={<ColorExtractorPage />} />
            <Route path="/image-info" element={<ImageInfoPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary key={location.pathname}>
          <AppFrame />
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  )
}
