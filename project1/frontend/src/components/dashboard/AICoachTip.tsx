'use client';

import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Lightbulb, Heart, X, RefreshCw, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface AICoachTipData {
  message: string;
  generated_at: string;
  type?: 'warning' | 'suggestion' | 'encouragement';
  priority?: 'high' | 'medium' | 'low';
}

export function AICoachTip({ onClose }: { onClose?: () => void }) {
  const [tip, setTip] = useState<AICoachTipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTip = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getDailyCoaching();
      if (response.success) {
        setTip({
          message: response.data.message,
          generated_at: response.data.generated_at,
          type: 'suggestion',
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Failed to load coaching tip:', error);
      // 기본 메시지 설정
      setTip({
        message: '오늘도 건강한 식습관을 위해 노력해보세요! 균형 잡힌 식사가 중요합니다.',
        generated_at: new Date().toISOString(),
        type: 'encouragement',
        priority: 'low'
      });
    }
    setLoading(false);
  };

  const refreshTip = async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.getCustomCoaching('daily');
      if (response.success) {
        setTip({
          message: response.data.message || response.data,
          generated_at: new Date().toISOString(),
          type: 'suggestion',
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Failed to refresh coaching tip:', error);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadTip();
  }, []);

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
          borderColor: 'border-red-200'
        };
      case 'suggestion':
        return {
          icon: Sparkles,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200'
        };
      case 'encouragement':
        return {
          icon: Heart,
          bgColor: 'bg-green-50',
          textColor: 'text-green-600',
          borderColor: 'border-green-200'
        };
      default:
        return {
          icon: Brain,
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200'
        };
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '중요';
      case 'medium': return '보통';
      case 'low': return '참고';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!tip || dismissed) {
    return null;
  }

  const { icon: Icon, bgColor, textColor, borderColor } = getIconAndColor(tip.type);

  return (
    <div className={`card p-4 ${bgColor} ${borderColor} border-2 relative overflow-hidden`}>
      {/* 배경 패턴 */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <Brain className="w-full h-full" />
      </div>
      
      <div className="flex items-start space-x-3 relative">
        <div className={`p-2 rounded-full ${bgColor} border ${borderColor}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm">🤖 AI 코치</h3>
              {tip.priority === 'high' && (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                  {getPriorityLabel(tip.priority)}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={refreshTip}
                disabled={refreshing}
                className="p-1 rounded-md hover:bg-white/50 transition-colors"
                title="새로운 조언 받기"
              >
                <RefreshCw className={`w-4 h-4 ${textColor} ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-white/50 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            {tip.message}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {new Date(tip.generated_at).toLocaleString('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} 업데이트
            </div>
            <button 
              onClick={() => {/* 상세 보기 모달 열기 */}}
              className={`text-xs ${textColor} hover:opacity-80 transition-colors font-medium`}
            >
              더 자세히 보기 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 