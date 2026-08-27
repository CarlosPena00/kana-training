import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { QuizProvider } from './state/QuizContext';
import { loadPreferences } from './state/preferences';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <QuizProvider initialConfiguration={loadPreferences()}>
      <App />
    </QuizProvider>
  </StrictMode>,
);
