import { useEffect } from 'react';
import homeMarkup from './templates/home.html?raw';

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export default function App() {
  useEffect(() => {
    let cancelled = false;

    async function initLegacyScripts() {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'lib-three');
        if (cancelled) return;

        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', 'lib-gsap');
        if (cancelled) return;

        await loadScript('/js/main.js', 'site-main');
        if (cancelled) return;

        await loadScript('/js/hero3d.js', 'site-hero3d');
      } catch (error) {
        console.error(error);
      }
    }

    initLegacyScripts();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: homeMarkup }} />;
}

