import React from 'react';
import ReactDOM from 'react-dom/client';
import MultiTenantApp from './App'; // Import the App.jsx file

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MultiTenantApp />
  </React.StrictMode>
);