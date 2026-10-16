import { useEffect, useLayoutEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ScrollTrigger } from './animations/motion';
import { useReducedMotion } from './hooks/useReducedMotion';
import Navbar from './components/Navbar';
import DownloadPage from './pages/DownloadPage';
import FeaturesPage from './pages/FeaturesPage';
import HomePage from './pages/HomePage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ServicesPage from './pages/ServicesPage';
import WorkHubPage from './pages/WorkHubPage';
import type { NavigationHandler, RoutePath } from './types';
import { getCurrentRoute, getServiceFromRoute } from './utils/routes';

function App() {
  const [route, setRoute] = useState<RoutePath>(() => getCurrentRoute());
  const reduced = useReducedMotion();
  const activeService = getServiceFromRoute(route);

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useLayoutEffect(() => {
    const anchor = window.location.hash;
    if (anchor) document.getElementById(anchor.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, [route]);

  useEffect(() => {
    let mounted = true;
    document.fonts?.ready.then(() => { if (mounted) ScrollTrigger.refresh(); });
    return () => { mounted = false; };
  }, [route]);

  const navigate: NavigationHandler = (event, path) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (route !== path) {
      window.history.pushState(null, '', path);
      setRoute(path);
    }
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user"><div className="site" id="top">
      <a href="#main-content" className="skipLink">Skip to content</a>
      <Navbar route={route} navigate={navigate} />

      <main id="main-content" tabIndex={-1} key={route}>
      {route === '/' && <HomePage navigate={navigate} />}
      {route === '/work-hub' && <WorkHubPage />}
      {route === '/services' && <ServicesPage navigate={navigate} />}
      {activeService && <ServiceDetailPage service={activeService} navigate={navigate} />}
      {route === '/features' && <FeaturesPage />}
      {route === '/download' && <DownloadPage />}
      </main>
      <footer className="experienceFooter"><strong>Inquiry<span>Experts</span></strong><p>A little closer. A lot more possible.</p><a href="#top">Back to top ↑</a></footer>
    </div></MotionConfig>
  );
}

export default App;
