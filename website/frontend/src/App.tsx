import { useEffect, useState } from 'react';
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
  const activeService = getServiceFromRoute(route);

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate: NavigationHandler = (event, path) => {
    event.preventDefault();
    if (route !== path) {
      window.history.pushState(null, '', path);
      setRoute(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="site" id="top">
      <Navbar route={route} navigate={navigate} />

      {route === '/' && <HomePage navigate={navigate} />}
      {route === '/work-hub' && <WorkHubPage />}
      {route === '/services' && <ServicesPage navigate={navigate} />}
      {activeService && <ServiceDetailPage service={activeService} navigate={navigate} />}
      {route === '/features' && <FeaturesPage />}
      {route === '/download' && <DownloadPage />}
    </main>
  );
}

export default App;
