import { useEffect, useState } from 'react';

/**
 * useScrollSpy - tracks which section (by id) is currently in view.
 * @param {string[]} sectionIds - array of element ids to observe.
 * @returns {string|null} active section id
 */
export const useScrollSpy = (sectionIds) => {
  const [activeId, setActiveId] = useState(sectionIds[0] || null);

  useEffect(() => {
    const observers = [];
    const options = {
      root: null,
      rootMargin: '0px 0px -70% 0px', // trigger when top of section is 30% from top of viewport
      threshold: 0,
    };

    const callback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const observer = new IntersectionObserver(callback, options);
        observer.observe(el);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionIds]);

  return activeId;
};
