// Точка входа React
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './ui/styles/variables.css';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './ui/styles/sections.css';
import './ui/styles/report.css';
import './ui/styles/print.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);