import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_FILTER, isFeedFilter } from './filters';
import { MainScreen } from './MainScreen';
import './main.css';

// Set by the main process from --camera and --filter=<name>.
const params = new URLSearchParams(location.search);
const filter = params.get('filter');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainScreen
      cameraOnly={params.has('camera')}
      filter={isFeedFilter(filter) ? filter : DEFAULT_FILTER}
    />
  </StrictMode>,
);
