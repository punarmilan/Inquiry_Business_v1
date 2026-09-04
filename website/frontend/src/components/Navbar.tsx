import { Download } from 'lucide-react';
import { navItems, PLAY_STORE_URL } from '../constants';
import type { NavigationHandler, RoutePath } from '../types';
import { isActiveNavItem } from '../utils/routes';

type NavbarProps = {
  route: RoutePath;
  navigate: NavigationHandler;
};

function Navbar({ route, navigate }: NavbarProps) {
  return (
    <header className="topNav">
      <a className="brand" href="/" aria-label="InquiryExperts home" onClick={(event) => navigate(event, '/')}>
        <span className="brandMark">A</span>
        <span>InquiryExperts</span>
      </a>

      <nav className="navLinks" aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            className={isActiveNavItem(route, item.path) ? 'active' : undefined}
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
