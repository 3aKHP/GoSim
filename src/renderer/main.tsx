import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 确保 DOM 已加载
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// 创建 React 根节点并渲染应用
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
