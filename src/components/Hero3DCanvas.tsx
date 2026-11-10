import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DCanvasProps {
  preset?: string;
  primaryColor?: string;
  accentColor?: string;
}

export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = ({
  preset = 'emerald_monolith',
  primaryColor = '#10b981',
  accentColor = '#d97706',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 360;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch {
      // Fallback if WebGL context is unavailable in headless environment
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 5.2);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(primaryColor, 2.4);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(accentColor, 2.0);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    // Core Emerald Faceted Monolith / Crystal
    const coreGeom =
      preset === 'gold_gyroscope'
        ? new THREE.OctahedronGeometry(1.15, 1)
        : new THREE.IcosahedronGeometry(1.18, 0);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(primaryColor),
      metalness: 0.25,
      roughness: 0.15,
      transmission: 0.45,
      thickness: 1.2,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    group.add(coreMesh);

    // Precision Brushed Gold Orbital Rings
    const ring1Geom = new THREE.TorusGeometry(1.68, 0.035, 16, 96);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      metalness: 0.85,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geom, ringMat);
    ring1.rotation.x = Math.PI / 2.8;
    group.add(ring1);

    const ring2Geom = new THREE.TorusGeometry(2.02, 0.022, 16, 96);
    const ring2 = new THREE.Mesh(ring2Geom, ringMat);
    ring2.rotation.y = Math.PI / 3.2;
    ring2.rotation.x = -Math.PI / 4;
    group.add(ring2);

    let targetRotX = 0;
    let targetRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetRotY = nx * 0.6;
      targetRotX = ny * 0.4;
    };

    container.addEventListener('mousemove', handlePointerMove);

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      coreMesh.rotation.y += 0.006;
      coreMesh.rotation.x += 0.003;
      ring1.rotation.z -= 0.008;
      ring2.rotation.y += 0.005;

      group.rotation.y += (targetRotY - group.rotation.y) * 0.06;
      group.rotation.x += (targetRotX - group.rotation.x) * 0.06;

      renderer?.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('mousemove', handlePointerMove);
      renderer?.dispose();
    };
  }, [preset, primaryColor, accentColor]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '300px',
        cursor: 'grab',
        position: 'relative',
      }}
      aria-label="Interactive 3D Executive Monolith"
    />
  );
};
