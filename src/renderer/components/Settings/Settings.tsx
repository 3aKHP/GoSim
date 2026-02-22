import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Button, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../../stores/settings-store';
import EngineSettings from './EngineSettings';
import GameSettings from './GameSettings';
import UISettings from './UISettings';
import './Settings.css';

const { TabPane } = Tabs;

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ visible, onClose }) => {
  const { settings, loadSettings, saveSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('game');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (visible && !settings) {
      loadSettings();
    }
  }, [visible, settings, loadSettings]);

  const handleSave = async () => {
    if (!settings) return;

    try {
      await saveSettings(settings);
      message.success('设置已保存');
      setHasChanges(false);
      onClose();
    } catch (error: any) {
      message.error(`保存失败: ${error.message}`);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Modal.confirm({
        title: '未保存的更改',
        content: '您有未保存的更改，确定要关闭吗？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          setHasChanges(false);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  const handleSettingChange = () => {
    setHasChanges(true);
  };

  if (!settings) {
    return null;
  }

  return (
    <Modal
      title={
        <div className="settings-title">
          <SettingOutlined style={{ marginRight: 8 }} />
          <span>设置</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          保存设置
        </Button>,
      ]}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="游戏设置" key="game">
          <GameSettings onChange={handleSettingChange} />
        </TabPane>
        <TabPane tab="界面设置" key="ui">
          <UISettings onChange={handleSettingChange} />
        </TabPane>
        <TabPane tab="引擎设置" key="engine">
          <EngineSettings onChange={handleSettingChange} />
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default Settings;
