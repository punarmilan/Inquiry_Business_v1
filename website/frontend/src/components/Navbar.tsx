import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import infinityLogo from '../../assets/infinity-logo-transparent.png';
import { navItems, PLAY_STORE_URL } from '../constants';
import type { NavigationHandler, RoutePath } from '../types';
import { isActiveNavItem } from '../utils/routes';

type NavbarProps = {
  route: RoutePath;
  navigate: NavigationHandler;
};

function Navbar({ route, navigate }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 16);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);
  return (
    <header className={`topNav${scrolled ? ' isScrolled' : ''}`}>
      <a className="brand" href="/" aria-label="InquiryExperts home" onClick={(event) => navigate(event, '/')}>
        <span className="brandMark"><img src={infinityLogo} alt="" /></span>
        <span className="brandWordmark">Inquiry<span>Experts</span><small>LOCAL DEALS &amp; SERVICES</small></span>
      </a>

      <nav className="navLinks" aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            className={isActiveNavItem(route, item.path) ? 'active' : undefined}
            aria-current={isActiveNavItem(route, item.path) ? 'page' : undefined}
            href={item.path}
            key={item.path}
            onClick={(event) => navigate(event, item.path)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a className="navButton" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">
        <Download size={16} aria-hidden="true" />
        Get the App
      </a>
    </header>
  );
}

export default Navbar;
