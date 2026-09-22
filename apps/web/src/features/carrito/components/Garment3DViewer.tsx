import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RotateCcw,
  Sun,
  Camera,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface Garment3DViewerProps {
  modelUrl: string;
  garmentName?: string;
  garmentTextureUrl?: string | null;
  className?: string;
}

type LightingPreset = 'studio' | 'warm' | 'runway';

export const Garment3DViewer: React.FC<Garment3DViewerProps> = ({
  modelUrl,
  garmentName = 'Prenda en 3D',
  garmentTextureUrl,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estados de control
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Referencias Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Configurar iluminación según preset
  const applyLightingPreset = useCallback((preset: LightingPreset, scene: THREE.Scene) => {
    if (lightsGroupRef.current) {
      scene.remove(lightsGroupRef.current);
      lightsGroupRef.current.clear();
    }

    const lights = new THREE.Group();

    if (preset === 'studio') {
      // Luz de estudio neutral y brillante para moda
      const ambient = new THREE.AmbientLight(0xffffff, 1.8);
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(3, 4, 5);

      const fillLight = new THREE.DirectionalLight(0xedf2f7, 1.2);
      fillLight.position.set(-3, 2, 4);

      const rimLight = new THREE.DirectionalLight(0xa5b4fc, 1.5);
      rimLight.position.set(0, 4, -4);

      lights.add(ambient, keyLight, fillLight, rimLight);
    } else if (preset === 'warm') {
      // Luz solar dorada
      const ambient = new THREE.AmbientLight(0xffedd5, 1.5);
      const sunLight = new THREE.DirectionalLight(0xfbbf24, 2.5);
      sunLight.position.set(4, 5, 3);

      const skyLight = new THREE.DirectionalLight(0x93c5fd, 1.0);
      skyLight.position.set(-4, 2, -2);

      lights.add(ambient, sunLight, skyLight);
    } else if (preset === 'runway') {
      // Pasarela dramática con acentos de color
      const ambient = new THREE.AmbientLight(0x18181b, 1.0);
      const spotMain = new THREE.SpotLight(0xffffff, 3.5, 20, Math.PI / 4, 0.4);
      spotMain.position.set(0, 6, 3);

      const rimPurple = new THREE.DirectionalLight(0x818cf8, 2.0);
      rimPurple.position.set(-3, 2, -3);

      const rimCyan = new THREE.DirectionalLight(0x06b6d4, 1.8);
      rimCyan.position.set(3, -1, -2);

      lights.add(ambient, spotMain, rimPurple, rimCyan);
    }

    lightsGroupRef.current = lights;
    scene.add(lights);
  }, []);

  // Inicializar escena Three.js
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 450;

    // 1. Escena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Grid sutil en el suelo
    const grid = new THREE.GridHelper(4, 16, 0xe2e8f0, 0xf1f5f9);
    grid.position.y = -1.0;
    scene.add(grid);

    // 2. Cámara
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 2.6);
    cameraRef.current = camera;

    // 3. Renderer con WebGL
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // Permite capturas de pantalla en HD
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.8;
    controls.maxDistance = 5.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Evita rotar por debajo del suelo
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.8;
    controlsRef.current = controls;

    // 5. Luces
    applyLightingPreset(lightingPreset, scene);

    // 6. Cargar modelo GLTF/GLB
    setLoading(true);
    setError(null);
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        if (!sceneRef.current) return;

        // Limpiar modelo previo si existe
        if (modelRef.current) {
          sceneRef.current.remove(modelRef.current);
        }

        const model = gltf.scene;
        modelRef.current = model;

        // Centrar y auto-escalar el modelo al visor
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 1.4 / maxDim;
        model.scale.setScalar(scale);

        // Reposicionar al centro exacto del escenario
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale;
        model.position.z = -center.z * scale;

        // Aplicar textura de prenda si está disponible y los materiales la soportan
        if (garmentTextureUrl) {
          const textureLoader = new THREE.TextureLoader();
          textureLoader.crossOrigin = 'anonymous';
          textureLoader.load(
            garmentTextureUrl,
            (tex) => {
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.RepeatWrapping;
              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  const m = child as THREE.Mesh;
                  if (m.material) {
                    const mat = (m.material as THREE.MeshStandardMaterial).clone();
                    mat.map = tex;
                    mat.needsUpdate = true;
                    m.material = mat;
                  }
                }
              });
            },
            undefined,
            () => {},
          );
        }

        scene.add(model);
        setLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.warn('Error al cargar GLB remoto, activando generador de malla local:', err);
        try {
          if (!sceneRef.current) return;
          const group = new THREE.Group();
          const torsoGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.9, 32);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x4f46e5,
            roughness: 0.35,
            metalness: 0.15,
          });

          if (garmentTextureUrl) {
            const texLoader = new THREE.TextureLoader();
            texLoader.crossOrigin = 'anonymous';
            texLoader.load(
              garmentTextureUrl,
              (tex) => {
                mat.map = tex;
                mat.needsUpdate = true;
              },
              undefined,
              () => {},
            );
          }

          const torso = new THREE.Mesh(torsoGeo, mat);
          group.add(torso);

          const armGeoL = new THREE.CylinderGeometry(0.12, 0.1, 0.45, 16);
          const armL = new THREE.Mesh(armGeoL, mat);
          armL.position.set(-0.45, 0.25, 0);
          armL.rotation.z = Math.PI / 4;
          group.add(armL);

          const armGeoR = new THREE.CylinderGeometry(0.12, 0.1, 0.45, 16);
          const armR = new THREE.Mesh(armGeoR, mat);
          armR.position.set(0.45, 0.25, 0);
          armR.rotation.z = -Math.PI / 4;
          group.add(armR);

          modelRef.current = group;
          sceneRef.current.add(group);
          setLoading(false);
          setError(null);
        } catch (meshErr) {
          setError('No se pudo renderizar el modelo 3D. Verifica la conexión con el servidor.');
          setLoading(false);
        }
      },
    );

    // 7. Loop de animación
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 8. Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Limpieza
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [modelUrl, garmentTextureUrl, reloadKey]);

  // Actualizar autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Actualizar Wireframe
  useEffect(() => {
    if (!modelRef.current) return;
    modelRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.wireframe = wireframe;
        }
      }
    });
  }, [wireframe]);

  // Actualizar iluminación
  useEffect(() => {
    if (sceneRef.current) {
      applyLightingPreset(lightingPreset, sceneRef.current);
    }
  }, [lightingPreset, applyLightingPreset]);

  // Resetear vista
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 0.4, 2.6);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  // Zoom In / Out
  const handleZoom = (delta: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const direction = cameraRef.current.position.clone().normalize();
    cameraRef.current.position.addScaledVector(direction, delta);
    controlsRef.current.update();
  };

  // Capturar imagen HD del 3D
  const handleCaptureSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `3d_look_${garmentName.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  // Alternar pantalla completa del visor
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-black select-none flex flex-col items-center justify-center border border-slate-800 ${className}`}
    >
      {/* CANVAS WEBGL */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* OVERLAY DE CARGA */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 space-y-3 animate-in fade-in duration-200">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="font-bold text-sm tracking-wide">Cargando Modelo 3D...</p>
          {loadProgress > 0 && (
            <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
          <p className="text-[11px] text-slate-400">Reconstrucción tridimensional de la prenda</p>
        </div>
      )}

      {/* OVERLAY DE ERROR */}
      {error && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white z-20 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <p className="text-sm font-bold text-rose-200">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar Vista</span>
          </button>
        </div>
      )}

      {/* BADGE INFORMATIVO SUPERIOR IZQUIERDO */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 flex items-center gap-2 text-white">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-black tracking-wide">360° Interactivo</span>
        </div>
        <span className="hidden sm:inline-block text-[11px] text-slate-400 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/5">
          Arrastra para girar • Rueda para zoom
        </span>
      </div>

      {/* SELECTOR DE ILUMINACIÓN SUPERIOR DERECHO */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => setLightingPreset('studio')}
          title="Luz de Estudio"
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            lightingPreset === 'studio'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Estudio</span>
        </button>

        <button
          type="button"
          onClick={() => setLightingPreset('warm')}
          title="Luz Cálida"
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            lightingPreset === 'warm'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cálida</span>
        </button>

        <button
          type="button"
          onClick={() => setLightingPreset('runway')}
          title="Luz de Pasarela"
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
            lightingPreset === 'runway'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pasarela</span>
        </button>
      </div>

      {/* BARRA DE HERRAMIENTAS INFERIOR FLOTANTE */}
      <div className="absolute bottom-4 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 text-white shadow-2xl">
        {/* Auto rotación */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? 'Detener Rotación Automática' : 'Iniciar Rotación Automática'}
          className={`p-2 rounded-xl transition ${
            autoRotate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <RotateCcw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
        </button>

        {/* Wireframe */}
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          title="Alternar Malla de Polígonos (Wireframe)"
          className={`p-2 rounded-xl transition ${
            wireframe ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/20 my-auto" />

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => handleZoom(-0.3)}
          title="Acercar (Zoom In)"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => handleZoom(0.3)}
          title="Alejar (Zoom Out)"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={handleResetCamera}
          title="Centrar Modelo"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/20 my-auto" />

        {/* Snapshot HD */}
        <button
          type="button"
          onClick={handleCaptureSnapshot}
          title="Capturar Foto 3D HD"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title="Pantalla Completa"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
