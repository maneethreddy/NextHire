import { useEffect, useRef } from 'react';

const SplineOrb = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src*="spline-viewer"]')) {
      return;
    }

    // Load Spline viewer script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.12.28/build/spline-viewer.js';
    document.head.appendChild(script);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {/* @ts-ignore */}
      <spline-viewer 
        url="https://prod.spline.design/ppX8QXY8idjB-Dni/scene.splinecode"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

export default SplineOrb;




