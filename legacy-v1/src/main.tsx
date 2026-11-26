import {createRoot} from 'react-dom/client';
import {warmGameModules} from './bootstrap.ts';
import App from './App.tsx';
import './index.css';

warmGameModules();

createRoot(document.getElementById('root')!).render(<App />);
