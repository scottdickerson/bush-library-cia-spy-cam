import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TouchScreen } from './TouchScreen';
import './touch.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TouchScreen />
  </StrictMode>,
);
