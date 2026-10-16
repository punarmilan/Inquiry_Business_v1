import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

const environment = vi.hoisted(() => {
  const state = { reduced: true, desktop: false, decodeFails: false, hidden: false };
  Object.defineProperty(document, 'hidden', { get: () => state.hidden, configurable: true });
  // jsdom cannot decode images; the hero only cycles poses once every frame reports decoded.
  HTMLImageElement.prototype.decode = () => state.decodeFails ? Promise.reject(new Error('Simulated decode failure')) : Promise.resolve();
  const queries = new Map<string, MediaQueryList>();
  Object.defineProperty(window, 'matchMedia', { value: (query: string) => {
    if (!queries.has(query)) {
      const listeners = new Set<() => void>();
      queries.set(query, {
        media: query,
        get matches() { return query.includes('prefers-reduced-motion') ? state.reduced : query.includes('min-width') ? state.desktop : false; },
        addEventListener: (_: string, callback: () => void) => listeners.add(callback),
        removeEventListener: (_: string, callback: () => void) => listeners.delete(callback),
        addListener: (callback: () => void) => listeners.add(callback),
        removeListener: (callback: () => void) => listeners.delete(callback),
        dispatchEvent: () => { listeners.forEach(callback => callback()); return true; },
        onchange: null,
      } as MediaQueryList);
    }
    return queries.get(query)!;
  }, configurable: true });
  const intersections = new Set<(entries: IntersectionObserverEntry[]) => void>();
  class Observer {
    constructor(callback: (entries: IntersectionObserverEntry[]) => void) { this.callback = callback; intersections.add(callback); }
    callback: (entries: IntersectionObserverEntry[]) => void;
    observe() {}
    unobserve() {}
    disconnect() { intersections.delete(this.callback); }
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  return { state, queries, intersections };
});

import App from '../src/App';
import AnimatedHero from '../src/components/AnimatedHero';
import DiscoveryExperience from '../src/components/DiscoveryExperience';
import WorkHubGallery from '../src/components/WorkHubGallery';
import { ScrollTrigger } from '../src/animations/motion';
import { PLAY_STORE_URL } from '../src/constants';
import { categories } from '../src/data/siteData';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  environment.state.reduced = true;
  environment.state.desktop = false;
  environment.state.decodeFails = false;
  environment.state.hidden = false;
  window.history.replaceState(null, '', '/');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function render(content = <App />) { await act(async () => root.render(<StrictMode>{content}</StrictMode>)); }
async function click(element: Element) { await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))); }
async function setHeroVisibility(visible: boolean) {
  await act(async () => {
    environment.intersections.forEach(callback => callback([{ isIntersecting: visible } as IntersectionObserverEntry]));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
}
async function setPageHidden(hidden: boolean) {
  await act(async () => {
    environment.state.hidden = hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
function expectSceneActive(active: boolean) {
  expect(container.querySelector('.heroEnvironment')?.getAttribute('data-motion')).toBe(active ? 'running' : 'paused');
  expect(container.querySelector('.cinematicHero')?.classList.contains('isLive')).toBe(active);
}
const shownPose = () => container.querySelector<HTMLImageElement>('.heroEnvironment img.heroPose')?.getAttribute('src');
async function showHeroWithFakeTimers() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  await render(<AnimatedHero navigate={vi.fn()} />);
  await act(async () => { environment.intersections.forEach(callback => callback([{ isIntersecting: true } as IntersectionObserverEntry])); });
}

describe('public frontend interactions', () => {
  it('keeps every page identity and service deep link reachable', async () => {
    await render();
    for (const [path, heading] of [['/features', 'Explore every part'], ['/services', 'From daily work'], ['/work-hub', 'One place'], ['/download', 'Install the']]) {
      await click(container.querySelector('.navLinks a[href="' + path + '"]')!);
      expect(window.location.pathname).toBe(path);
      expect(container.querySelector('h1')?.textContent).toContain(heading);
    }
    await click(container.querySelector('.navLinks a[href="/services"]')!);
    for (const service of categories) expect(container.querySelector('a[href="/services/' + service.slug + '"]')).not.toBeNull();
    await click(container.querySelector('a[href="/services/plumber"]')!);
    expect(container.querySelector('h1')?.textContent).toBe('Plumber');
    await act(async () => { window.history.replaceState(null, '', '/services/electrician'); window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(container.querySelector('h1')?.textContent).toBe('Electrician');
  });

  it('uses the configured download destination and exposes the QR anchor', async () => {
    window.history.replaceState(null, '', '/download#install');
    await render();
    expect(container.querySelector('#install')).not.toBeNull();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    const downloads = [...container.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];
    expect(downloads.length).toBeGreaterThan(2);
    downloads.forEach(link => expect(link.href).toBe(PLAY_STORE_URL));
    expect(container.querySelector('.qrPanel svg title')?.textContent).toContain('Play Store');
  });

  it('supports Escape, focus restoration and a contained mobile menu tab cycle', async () => {
    await render();
    const toggle = container.querySelector<HTMLButtonElement>('.menuToggle')!;
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    const links = container.querySelectorAll<HTMLAnchorElement>('.mobileNavigation a');
    expect(document.activeElement).toBe(links[0]);
    links[links.length - 1].focus();
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(toggle);
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    expect(document.body.style.overflow).toBe('');
  });

  it('leaves all chapters readable without pinning under reduced motion', async () => {
    const baseline = ScrollTrigger.getAll().length;
    await render(<DiscoveryExperience navigate={vi.fn()} />);
    expect(container.querySelectorAll('.discoveryChapter')).toHaveLength(3);
    expect(container.textContent).toContain('Promote local business');
    expect(container.querySelector('.discoveryProduct .phoneFrame')).not.toBeNull();
    expect(ScrollTrigger.getAll()).toHaveLength(baseline);
  });

  it('removes only its own scroll triggers on preference changes and unmount', async () => {
    environment.state.reduced = false;
    environment.state.desktop = true;
    const unrelated = ScrollTrigger.create({ trigger: document.body, start: 0, end: 10 });
    await render(<DiscoveryExperience navigate={vi.fn()} />);
    expect(ScrollTrigger.getAll().length).toBeGreaterThan(1);
    await act(async () => {
      environment.state.reduced = true;
      environment.queries.forEach(query => query.dispatchEvent(new Event('change')));
    });
    expect(ScrollTrigger.getAll()).toEqual([unrelated]);
    await act(async () => root.render(<div />));
    expect(ScrollTrigger.getAll()).toEqual([unrelated]);
    unrelated.kill();
  });

  it('calculates gallery progression from measured overflow and cleans its pin', async () => {
    environment.state.reduced = false;
    environment.state.desktop = true;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function(this: HTMLElement) { return this.classList.contains('galleryViewport') ? 1000 : 0; });
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function(this: HTMLElement) { return this.classList.contains('workHubGalleryGrid') ? 1800 : 0; });
    const baseline = ScrollTrigger.getAll().length;
    await render(<WorkHubGallery />);
    ScrollTrigger.refresh();
    const pin = ScrollTrigger.getAll().find(trigger => trigger.vars.pin === true)!;
    expect(pin).toBeDefined();
    expect(Math.round(pin.end - pin.start)).toBe(800);
    await act(async () => root.render(<div />));
    expect(ScrollTrigger.getAll()).toHaveLength(baseline);
    expect(document.querySelector('.pin-spacer')).toBeNull();
  });

  it('preserves a complete hero with a poster and CTAs under reduced motion', async () => {
    await render(<AnimatedHero navigate={vi.fn()} />);
    await setHeroVisibility(true);
    expect(container.querySelector('section.cinematicHero h1')?.textContent).toContain('Your world.');
    expect(shownPose()).toContain('smiling_woman_with_smartphone_cutout');
    expect(container.querySelector('.heroEnvironment')?.getAttribute('data-motion')).toBe('reduced');
    expect(container.querySelector('.cinematicHero')?.classList.contains('isReduced')).toBe(true);
    expect(container.querySelector('.heroActions a')?.getAttribute('href')).toBe(PLAY_STORE_URL);
    expect(container.querySelector('.heroActions a[href="/download"]')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.sceneToggle')).toBeNull();
    expect(container.querySelector('.phoneFrame')).toBeNull();
  });

  it('lets the user pause the background and keeps that choice across visibility changes', async () => {
    environment.state.reduced = false;
    await render(<AnimatedHero navigate={vi.fn()} />);
    await setHeroVisibility(true);
    expectSceneActive(true);
    const toggle = container.querySelector<HTMLButtonElement>('.sceneToggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Pause background motion');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await click(toggle);
    expectSceneActive(false);
    expect(toggle.getAttribute('aria-label')).toBe('Play background motion');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await setHeroVisibility(false);
    await setPageHidden(true);
    await setHeroVisibility(true);
    await setPageHidden(false);
    expectSceneActive(false);
    await click(toggle);
    expectSceneActive(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('runs background motion only while the hero and page are both visible', async () => {
    environment.state.reduced = false;
    await render(<AnimatedHero navigate={vi.fn()} />);
    expectSceneActive(false);
    await setHeroVisibility(true);
    expectSceneActive(true);
    await setHeroVisibility(false);
    expectSceneActive(false);
    await setPageHidden(true);
    await setHeroVisibility(true);
    expectSceneActive(false);
    await setPageHidden(false);
    expectSceneActive(true);
    await setPageHidden(true);
    expectSceneActive(false);
    await setHeroVisibility(false);
    await setPageHidden(false);
    expectSceneActive(false);
    await setHeroVisibility(true);
    expectSceneActive(true);
  });

  it('settles into the still composition on a live reduced-motion change without removing hero content', async () => {
    environment.state.reduced = false;
    await showHeroWithFakeTimers();
    expectSceneActive(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(3300); });
    expect(shownPose()).not.toContain('smiling_woman_with_smartphone_cutout');
    const headline = container.querySelector('h1')?.textContent;
    await act(async () => {
      environment.state.reduced = true;
      environment.queries.forEach(query => query.dispatchEvent(new Event('change')));
    });
    expect(container.querySelector('.heroEnvironment')?.getAttribute('data-motion')).toBe('reduced');
    expect(shownPose()).toContain('smiling_woman_with_smartphone_cutout');
    expect(container.querySelector('.sceneToggle')).toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe(headline);
    expect(container.querySelector('.heroActions a')?.getAttribute('href')).toBe(PLAY_STORE_URL);
    expect(container.querySelector('.heroActions a[href="/download"]')).not.toBeNull();
    await act(async () => {
      environment.state.reduced = false;
      environment.queries.forEach(query => query.dispatchEvent(new Event('change')));
    });
    expectSceneActive(true);
  });

  it('cycles the brand portrait poses once decoded and holds the current pose while paused', async () => {
    environment.state.reduced = false;
    await showHeroWithFakeTimers();
    const poster = shownPose();
    expect(poster).toContain('smiling_woman_with_smartphone_cutout');
    await act(async () => { await vi.advanceTimersByTimeAsync(3300); });
    const next = shownPose();
    expect(next).not.toBe(poster);
    await click(container.querySelector('.sceneToggle')!);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(shownPose()).toBe(next);
    await click(container.querySelector('.sceneToggle')!);
    await act(async () => { await vi.advanceTimersByTimeAsync(3300); });
    expect(shownPose()).not.toBe(next);
  });

  it('keeps the poster pose, copy and CTAs when the portrait frames cannot be decoded', async () => {
    environment.state.reduced = false;
    environment.state.decodeFails = true;
    await showHeroWithFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(shownPose()).toContain('smiling_woman_with_smartphone_cutout');
    expectSceneActive(true);
    expect(container.querySelector('h1')?.textContent).toContain('Your world.');
    expect(container.querySelector('.heroActions a')?.getAttribute('href')).toBe(PLAY_STORE_URL);
    expect(container.querySelector('.phoneFrame')).toBeNull();
  });
});
