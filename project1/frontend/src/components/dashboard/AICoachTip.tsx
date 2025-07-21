'use client';

import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, Lightbulb, Heart, X } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { AICoachTip as AICoachTipType } from '@/types';

export function AICoachTip({ onClose }: { onClose?: () => void }) {
  const [tip, setTip] = useState<AICoachTipType | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadTip = async () => {
      setLoading(true);
      try {
        const tip = await apiClient.getCoachingTip();
        setTip(tip);
      } catch (error) {
        console.error('Failed to load coaching tip:', error);
        setTip(null);
      }
      setLoading(false);
    };

    loadTip();
  }, []);

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10',
          textColor: 'text-destructive',
          borderColor: 'border-destructive/20'
        };
      case 'suggestion':
        return {
          icon: Lightbulb,
          bgColor: 'bg-primary/10',
          textColor: 'text-primary',
          borderColor: 'border-primary/20'
        };
      case 'encouragement':
        return {
          icon: Heart,
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      default:
        return {
          icon: Brain,
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border'
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
    <div className={`card p-4 ${bgColor} ${borderColor} border-2`}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${bgColor}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm font-nanum">AI 코치 팁</h3>
              {tip.priority === 'high' && (
                <span className="px-2 py-1 text-xs rounded-full bg-destructive/20 text-destructive">
                  {getPriorityLabel(tip.priority)}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <p className="text-sm text-foreground leading-relaxed">
            {tip.message}
          </p>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              방금 전 업데이트
            </div>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors">
              더 자세히 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 