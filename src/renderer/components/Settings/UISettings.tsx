import React from 'react';
import { Form, Select, Switch, Divider } from 'antd';
import { useSettingsStore } from '../../stores/settings-store';

const { Option } = Select;

interface UISettingsProps {
  onChange: () => void;
}

const UISettings: React.FC<UISettingsProps> = ({ onChange }) => {
  const { settings, saveSettings } = useSettingsStore();

  if (!settings) return null;

  const handleChange = async (field: string, value: any) => {
    await saveSettings({ [field]: value });
    onChange();
  };

  return (
    <div className="ui-settings">
      <Form layout="vertical">
        <Divider orientation="left">外观</Divider>

        <Form.Item label="主题">
          <Select
            value={settings.theme}
            onChange={(value) => handleChange('theme', value)}
          >
            <Option value="light">浅色主题</Option>
            <Option value="dark">深色主题</Option>
            <Option value="auto">跟随系统</Option>
          </Select>
        </Form.Item>

        <Form.Item label="语言">
          <Select
            value={settings.language}
            onChange={(value) => handleChange('language', value)}
          >
            <Option value="zh">简体中文</Option>
            <Option value="en">English</Option>
            <Option value="ja">日本語</Option>
          </Select>
        </Form.Item>

        <Divider orientation="left">棋盘显示</Divider>

        <Form.Item label="显示坐标">
          <Switch
            checked={settings.showCoordinates}
            onChange={(checked) => handleChange('showCoordinates', checked)}
          />
          <div className="setting-description">
            在棋盘边缘显示坐标标签
          </div>
        </Form.Item>

        <Form.Item label="显示手数">
          <Switch
            checked={settings.showMoveNumbers}
            onChange={(checked) => handleChange('showMoveNumbers', checked)}
          />
          <div className="setting-description">
            在棋子上显示落子手数
          </div>
        </Form.Item>

        <Form.Item label="显示推荐着法">
          <Switch
            checked={settings.showSuggestedMoves}
            onChange={(checked) => handleChange('showSuggestedMoves', checked)}
          />
          <div className="setting-description">
            显示AI推荐的着法位置
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default UISettings;
