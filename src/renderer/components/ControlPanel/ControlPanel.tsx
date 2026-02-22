import React from 'react';
import { Card, Button, Space, Slider, Statistic, Row, Col, Divider, Tag } from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  FastForwardOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useGameStore } from '../../stores/game-store';
import { useSettingsStore } from '../../stores/settings-store';
import AISettings from './AISettings';
import WinrateChart from '../Statistics/WinrateChart';
import './ControlPanel.css';

const ControlPanel: React.FC = () => {
  const { gameState, startGame, pauseGame, resumeGame, stopGame, setSpeed } = useGameStore();
  const { settings } = useSettingsStore();

  const isPlaying = gameState?.gameStatus === 'playing';
  const isPaused = gameState?.gameStatus === 'paused';
  const isIdle = !gameState || gameState.gameStatus === 'idle';

  const handleStart = async () => {
    if (!settings) return;
    
    // 使用 boardSize 字段（这是当前实际的棋盘大小）
    const boardSize = settings.boardSize || settings.defaultBoardSize || 19;
    
    await startGame(
      boardSize,
      settings.defaultAIBlack,
      settings.defaultAIWhite,
      settings.defaultKomi || 6.5,
      settings.defaultHandicap || 0
    );
  };

  const handlePause = () => {
    pauseGame();
  };

  const handleResume = () => {
    resumeGame();
  };

  const handleStop = () => {
    stopGame();
  };

  const handleSpeedChange = (value: number) => {
    setSpeed(value);
  };

  return (
    <div className="control-panel">
      {/* 游戏控制 */}
      <Card title="游戏控制" size="small" className="control-card">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
            {isIdle && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
                size="large"
              >
                开始对弈
              </Button>
            )}
            
            {isPlaying && (
              <Button
                icon={<PauseOutlined />}
                onClick={handlePause}
                size="large"
              >
                暂停
              </Button>
            )}
            
            {isPaused && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleResume}
                size="large"
              >
                继续
              </Button>
            )}
            
            {!isIdle && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleStop}
                size="large"
              >
                停止
              </Button>
            )}
          </Space>

          {/* 速度控制 */}
          {!isIdle && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <FastForwardOutlined style={{ marginRight: 8 }} />
                  <span>对弈速度</span>
                </div>
                <Slider
                  min={1}
                  max={10}
                  value={gameState?.speed || 5}
                  onChange={handleSpeedChange}
                  marks={{
                    1: '慢',
                    5: '中',
                    10: '快',
                  }}
                />
              </div>
            </>
          )}
        </Space>
      </Card>

      {/* 游戏状态 */}
      {gameState && (
        <Card title="游戏状态" size="small" className="control-card">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="手数"
                  value={gameState.moveNumber}
                  valueStyle={{ fontSize: 20 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="当前回合"
                  value={gameState.currentPlayer === 'black' ? '黑方' : '白方'}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="黑方提子"
                  value={gameState.capturedBlack}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="白方提子"
                  value={gameState.capturedWhite}
                  valueStyle={{ fontSize: 18 }}
                />
              </Col>
            </Row>

            <Divider style={{ margin: '8px 0' }} />

            <div>
              <span style={{ marginRight: 8 }}>状态：</span>
              <Tag color={
                gameState.gameStatus === 'playing' ? 'green' :
                gameState.gameStatus === 'paused' ? 'orange' :
                gameState.gameStatus === 'finished' ? 'blue' :
                'default'
              }>
                {
                  gameState.gameStatus === 'playing' ? '对弈中' :
                  gameState.gameStatus === 'paused' ? '已暂停' :
                  gameState.gameStatus === 'finished' ? '已结束' :
                  gameState.gameStatus === 'configuring' ? '配置中' :
                  gameState.gameStatus === 'ready' ? '准备就绪' :
                  '空闲'
                }
              </Tag>
            </div>
          </Space>
        </Card>
      )}

      {/* 胜率曲线 */}
      {gameState && (
        <Card title="实时分析" size="small" className="control-card">
          <WinrateChart />
        </Card>
      )}

      {/* AI设置 */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>AI设置</span>
          </Space>
        }
        size="small"
        className="control-card"
      >
        <AISettings />
      </Card>
    </div>
  );
};

export default ControlPanel;
