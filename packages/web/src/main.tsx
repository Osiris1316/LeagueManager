import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { SeasonsProvider } from './context/SeasonsContext';
import { App } from './App';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <SeasonsProvider>
        <AdminProvider>
          <App />
        </AdminProvider>
      </SeasonsProvider>
    </BrowserRouter>
  </StrictMode>
);