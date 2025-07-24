import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/responsive.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AppProvider } from './context/AppContext';
import { initPolyfills } from './utils/polyfills';

// Initialize polyfills for broader browser compatibility
initPolyfills();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
