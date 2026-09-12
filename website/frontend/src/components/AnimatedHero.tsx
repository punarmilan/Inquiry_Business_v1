import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import './AnimatedHero.css';

const heroAsset = (name: string) =>
  `${import.meta.env.BASE_URL}hero-motion/${name}`;

const poster = heroAsset(
  'smiling_woman_with_smartphone_cutout.png'
);

const frames = [
  'dreamy_woman_in_teal_hoodie_with_smartphone.png',
  'smiling_woman_in_teal_hoodie_with_phone.png',
  'smiling_woman_with_smartphone_cutout.png',
  'smiling_woman_with_smartphone_in_teal_hoodie.png',
  'teal_hoodie_smartphone_portrait.png',
  'woman_in_teal_hoodie_with_smartphone.png',
  'woman_using_smartphone_in_teal_hoodie.png',
  'young_woman_holding_smartphone_in_teal_hoodie.png',
].map(heroAsset);

export default function AnimatedHero() {
  const container = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(0);

  /*
   * Check user's reduced-motion preference.
   */
  useEffect(() => {
    const preference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const update = () => {
      setReduced(preference.matches);
    };

    update();

    preference.addEventListener('change', update);

    return () => {
      preference.removeEventListener('change', update);
    };
  }, []);

  /*
   * Preload + decode every image before animation starts.
   *
   * This prevents:
   * - empty frame
   * - network flicker
   * - half-loaded image
   * - image flashing while changing
   */
  useEffect(() => {
    if (reduced) return;

    let cancelled = false;

    const preloadImages = async () => {
      try {
        await Promise.all(
          frames.map(
            (src) =>
              new Promise<void>((resolve, reject) => {
                const img = new Image();

                img.onload = async () => {
                  try {
                    await img.decode();
                  } catch {
                    // Image is already loaded,
                    // decode failure should not block playback.
                  }

                  resolve();
                };

                img.onerror = reject;
                img.src = src;
              })
          )
        );

        if (!cancelled) {
          setReady(true);
        }
      } catch {
        /*
         * If any frame fails,
         * keep showing the poster.
         */
      }
    };

    preloadImages();

    return () => {
      cancelled = true;
    };
  }, [reduced]);

  /*
   * Pause automatically when:
   * - user changes browser tab
   * - hero goes outside viewport
   */
  useEffect(() => {
    let inViewport = true;

    const updateVisibility = () => {
      setVisible(inViewport && !document.hidden);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        updateVisibility();
      },
      {
        threshold: 0.05,
      }
    );

    if (container.current) {
      observer.observe(container.current);
    }

    document.addEventListener(
      'visibilitychange',
      updateVisibility
    );

    updateVisibility();

    return () => {
      observer.disconnect();

      document.removeEventListener(
        'visibilitychange',
        updateVisibility
      );
    };
  }, []);

  /*
   * Animation can run only when:
   * - all images are loaded
   * - user has not paused
   * - reduced motion is disabled
   * - hero is visible
   */
  const playing =
    ready &&
    !paused &&
    !reduced &&
    visible;

  /*
   * Direct image switching.
   *
   * NO:
   * - fade
   * - opacity
   * - dissolve
   * - blur
   * - animation
   * - transition
   */
  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(() => {
      setCurrent(
        (prev) => (prev + 1) % frames.length
      );
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, current]);

  return (
    <>
      <div
        ref={container}
        className="heroBackdropImage heroMotion"
        aria-hidden="true"
      >
        <div className="heroMotionLayers">
          {!ready || reduced ? (
            <img
              className="heroMotionImage"
              src={poster}
              alt=""
              fetchPriority="high"
              draggable={false}
            />
          ) : (
            <img
              className="heroMotionImage"
              src={frames[current]}
              alt=""
              draggable={false}
            />
          )}
        </div>
      </div>

      {ready && !reduced && (
        <button
          className="heroMotionControl"
          type="button"
          onClick={() =>
            setPaused((prev) => !prev)
          }
          aria-label={
            paused
              ? 'Play hero animation'
              : 'Pause hero animation'
          }
          aria-pressed={paused}
        >
          {paused ? (
            <Play size={15} />
          ) : (
            <Pause size={15} />
          )}

          <span>
            {paused
              ? 'Play motion'
              : 'Pause motion'}
          </span>
        </button>
      )}
    </>
  );
}