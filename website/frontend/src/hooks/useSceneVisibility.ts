import { useEffect, useRef, useState } from 'react';

export function useSceneVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    let visible = false;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) setSeen(true);
      update();
    });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, []);
  return { ref, active, seen };
}
