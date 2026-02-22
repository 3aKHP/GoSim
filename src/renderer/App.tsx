import React, { useEffect } from 'react';
import { ConfigProvider, Layout, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useSettingsStore } from './stores/settings-store';
import { useUIStore } from './stores/ui-store';
import Board from './components/Board/Board';
import ControlPanel from './components/ControlPanel/ControlPanel';
import GameOverModal from './components/Board/GameOverModal';
import './App.css';

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
  const { settings, loadSettings } = useSettingsStore();
  const { sidebarCollapsed } = useUIStore();

  // 加载用户设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 根据用户设置选择主题
  const appTheme = settings?.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: appTheme,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 4,
        },
      }}
    >
      <Layout className="app-layout">
        <Header className="app-header">
          <div className="app-title">
            <span className="app-icon">⚫⚪</span>
            <span>围棋模拟器</span>
          </div>
          <div className="app-actions">
            {/* 窗口控制按钮 */}
            <button
              className="window-button"
              onClick={() => window.electronAPI.minimizeWindow()}
              title="最小化"
            >
              −
            </button>
            <button
              className="window-button"
              onClick={() => window.electronAPI.toggleMaximizeWindow()}
              title="最大化/还原"
            >
              □
            </button>
            <button
              className="window-button close"
              onClick={() => window.electronAPI.closeWindow()}
              title="关闭"
            >
              ×
            </button>
          </div>
        </Header>

        <Layout className="app-content">
          <Content className="board-container">
            <Board />
          </Content>

          <Sider
            className="control-panel-sider"
            width={320}
            collapsedWidth={0}
            collapsed={sidebarCollapsed}
            theme={settings?.theme === 'dark' ? 'dark' : 'light'}
          >
            <ControlPanel />
          </Sider>
        </Layout>
      </Layout>
      <GameOverModal />
    </ConfigProvider>
  );
};

export default App;
