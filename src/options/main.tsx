import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from './App';
import '../styles/globals.css';
import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
    <Toaster position="top-right" richColors />
  </React.StrictMode>
);