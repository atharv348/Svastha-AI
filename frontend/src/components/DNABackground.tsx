import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function DNABackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 12;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- DNA STRAND (Offset to the right) ---
    const dnaGroup = new THREE.Group();
    
    // Position offset to the right where it won't interfere with form text
    dnaGroup.position.set(5, -4, -2);
    
    // Aesthetic tilt
    dnaGroup.rotation.z = Math.PI / 8;
    
    scene.add(dnaGroup);

    const numPoints = 40;
    const radius = 1.4;
    const heightStep = 0.25;

    const sphereGeom = new THREE.SphereGeometry(0.12, 16, 16);
    // Enhanced Glow (Higher emissive intensity)
    const greenMat = new THREE.MeshPhongMaterial({ 
      color: 0x10b981, 
      emissive: 0x10b981, 
      emissiveIntensity: 1.2,
      shininess: 100 
    });
    const blueMat = new THREE.MeshPhongMaterial({ 
      color: 0x3b82f6, 
      emissive: 0x3b82f6, 
      emissiveIntensity: 1.2,
      shininess: 100 
    });
    const lineMat = new THREE.MeshBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.25 
    });

    const createDNA = (group: THREE.Group) => {
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 4;
        const y = i * heightStep;
        const x1 = Math.cos(angle) * radius;
        const z1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle + Math.PI) * radius;
        const z2 = Math.sin(angle + Math.PI) * radius;

        const s1 = new THREE.Mesh(sphereGeom, greenMat);
        s1.position.set(x1, y, z1);
        group.add(s1);

        const s2 = new THREE.Mesh(sphereGeom, blueMat);
        s2.position.set(x2, y, z2);
        group.add(s2);

        const cylinderGeom = new THREE.CylinderGeometry(0.012, 0.012, radius * 2);
        const line = new THREE.Mesh(cylinderGeom, lineMat);
        line.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        line.rotation.z = Math.PI / 2;
        line.rotation.y = -angle;
        group.add(line);
      }
    };

    createDNA(dnaGroup);

    // --- DECORATIVE 3D ELEMENTS ---
    const decoGroup = new THREE.Group();
    scene.add(decoGroup);

    // Floating Torus/Rings
    const ringGeom = new THREE.TorusGeometry(0.4, 0.02, 16, 100);
    const ringMat = new THREE.MeshPhongMaterial({ 
      color: 0x10b981, 
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      transparent: true, 
      opacity: 0.5 
    });
    for(let i=0; i<8; i++) {
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, (Math.random()-0.5)*5);
        ring.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        decoGroup.add(ring);
    }

    // Floating Cubes
    const boxGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const boxMat = new THREE.MeshPhongMaterial({ 
      color: 0x3b82f6, 
      emissive: 0x3b82f6,
      emissiveIntensity: 0.8,
      transparent: true, 
      opacity: 0.6 
    });
    for(let i=0; i<12; i++) {
        const box = new THREE.Mesh(boxGeom, boxMat);
        box.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, (Math.random()-0.5)*5);
        box.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        decoGroup.add(box);
    }

    // Floating Tetrahedrons (Health Cells)
    const tetraGeom = new THREE.TetrahedronGeometry(0.3);
    const tetraMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 });
    for(let i=0; i<6; i++) {
        const tetra = new THREE.Mesh(tetraGeom, tetraMat);
        tetra.position.set((Math.random()-0.5)*15, (Math.random()-0.5)*10, (Math.random()-0.5)*5);
        decoGroup.add(tetra);
    }

    // Particles (Dust)
    const particlesGeom = new THREE.BufferGeometry();
    const particlesCount = 400;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 25;
    }
    particlesGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({ size: 0.03, color: 0xffffff, transparent: true, opacity: 0.4 });
    const particlesMesh = new THREE.Points(particlesGeom, particlesMat);
    scene.add(particlesMesh);

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x10b981, 2, 20);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    const bluePointLight = new THREE.PointLight(0x3b82f6, 2, 20);
    bluePointLight.position.set(-5, -5, 5);
    scene.add(bluePointLight);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let animationId: number;
    const animate = (time: number) => {
      dnaGroup.rotation.y += 0.008;

      decoGroup.children.forEach((child, i) => {
          child.rotation.x += 0.01;
          child.rotation.y += 0.01;
          child.position.y += Math.sin(time * 0.001 + i) * 0.005;
      });

      particlesMesh.rotation.y += 0.0005;
      
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate(0);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      ringGeom.dispose();
      ringMat.dispose();
      boxGeom.dispose();
      boxMat.dispose();
      tetraGeom.dispose();
      tetraMat.dispose();
      particlesGeom.dispose();
      particlesMat.dispose();
      sphereGeom.dispose();
      greenMat.dispose();
      blueMat.dispose();
      lineMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
