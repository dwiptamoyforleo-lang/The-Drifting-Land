import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { WeatherSystem, WeatherType } from './game/weather';
import { RedMoonEventSystem, CrimsonWardenBoss } from './game/redMoonBoss';
import { REGIONAL_BOSSES } from './game/bosses';
import { DimensionManager, DIMENSIONS_DATABASE } from './game/dimensions';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Systems State
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('clear');
  const [isNight, setIsNight] = useState<boolean>(false);
  const [redMoonActive, setRedMoonActive] = useState<boolean>(false);
  const [currentDimension, setCurrentDimension] = useState<number>(1);
  const [anchorsCount, setAnchorsCount] = useState<number>(0);
  const [notification, setNotification] = useState<string>('Welcome to The Drifting World.');

  // Game Logic Instances
  const weatherSystemRef = useRef<WeatherSystem>(new WeatherSystem('balanced'));
  const redMoonSystemRef = useRef<RedMoonEventSystem>(new RedMoonEventSystem());
  const dimensionManagerRef = useRef<DimensionManager>(new DimensionManager());
  const crimsonWardenRef = useRef<CrimsonWardenBoss>(new CrimsonWardenBoss());

  useEffect(() => {
    if (!containerRef.current) return;

    // Three.js Basic Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111625);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 15, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // Test Terrain / Platform
    const geometry = new THREE.BoxGeometry(100, 2, 100);
    const material = new THREE.MeshStandardMaterial({ color: 0x2b4c3f });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.y = -1;
    scene.add(platform);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Update Weather
      weatherSystemRef.current.update(delta, camera.position.y);
      setCurrentWeather(weatherSystemRef.current.state.current);

      // Render Scene
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Handlers for UI Controls
  const toggleDayNight = () => {
    const nextNightState = !isNight;
    setIsNight(nextNightState);

    if (nextNightState) {
      const redMoonTriggered = redMoonSystemRef.current.checkNightTransition(true);
      if (redMoonTriggered) {
        setRedMoonActive(true);
        setNotification('⚠️ The Red Moon rises! The Crimson Warden appears!');
      } else {
        setRedMoonActive(false);
        setNotification('Night falls across the realm.');
      }
    } else {
      redMoonSystemRef.current.checkNightTransition(false);
      setRedMoonActive(false);
      setNotification('A new dawn breaks.');
    }
  };

  const handleForceRedMoon = () => {
    redMoonSystemRef.current.forceTriggerRedMoon();
    setRedMoonActive(true);
    setNotification('⚡ Developer Override: Red Moon forced active!');
  };

  const handleSwitchDimension = (dimId: number) => {
    const success = dimensionManagerRef.current.switchDimension(dimId, anchorsCount);
    if (success) {
      setCurrentDimension(dimId);
      const dimInfo = DIMENSIONS_DATABASE.find((d) => d.id === dimId);
      setNotification(`Shifted dimension to: ${dimInfo?.name}`);
    } else {
      setNotification(`Cannot access dimension. Requires more anchors.`);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay UI Panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '320px',
        zIndex: 10
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: redMoonActive ? '#ff4d4d' : '#4da6ff' }}>
          {redMoonActive ? '🔴 RED MOON ACTIVE' : '🌍 World Telemetry'}
        </h3>
        <p style={{ margin: '4px 0' }}><strong>Dimension:</strong> {DIMENSIONS_DATABASE.find(d => d.id === currentDimension)?.name}</p>
        <p style={{ margin: '4px 0' }}><strong>Weather:</strong> {currentWeather.toUpperCase()}</p>
        <p style={{ margin: '4px 0' }}><strong>Time:</strong> {isNight ? 'Night' : 'Day'}</p>
        <p style={{ margin: '4px 0' }}><strong>Anchors:</strong> {anchorsCount}</p>

        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={toggleDayNight} style={buttonStyle}>
            Toggle {isNight ? 'Day' : 'Night'}
          </button>
          <button onClick={handleForceRedMoon} style={{ ...buttonStyle, backgroundColor: '#800' }}>
            Force Red Moon
          </button>
        </div>

        <h4 style={{ margin: '14px 0 6px 0' }}>Dimensions:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {DIMENSIONS_DATABASE.map((dim) => (
            <button
              key={dim.id}
              onClick={() => handleSwitchDimension(dim.id)}
              style={{
                ...buttonStyle,
                backgroundColor: currentDimension === dim.id ? '#2b6cb0' : '#2d3748',
                textAlign: 'left'
              }}
            >
              {dim.name} {dim.requiredAnchors > anchorsCount ? `(Locked: ${dim.requiredAnchors} Anchors)` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Notification Banner */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(20, 20, 30, 0.85)',
        color: '#e2e8f0',
        padding: '10px 20px',
        borderRadius: '4px',
        border: '1px solid #4a5568',
        zIndex: 10,
        textAlign: 'center'
      }}>
        {notification}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#4a5568',
  color: 'white',
  border: 'none',
  padding: '6px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

export default App;
