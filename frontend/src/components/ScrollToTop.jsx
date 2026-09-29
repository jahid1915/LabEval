import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * Automatically resets scroll position to the exact top (0, 0) upon any route navigation.
 * Also resets scroll state for internal overflow-y containers.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Instant window scroll to absolute top
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });

    // 2. Also reset scroll state on main layout viewports and documentElement
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    const scrollContainers = document.querySelectorAll('main, .overflow-y-auto');
    scrollContainers.forEach((container) => {
      container.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}
