import React, { useState, useEffect } from 'react';
import FormattedAiResponse from './FormattedAiResponse';

interface AdvancedInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedInsightModal: React.FC<AdvancedInsightModalProps> = ({ isOpen, onClose }) => {
  const [insight, setInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const generateInsight = async () => {
    setIsLoading(true);
    setInsight('');

    try {
      const response = await fetch('/api/ai/coaching/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 세션 쿠키 포함
        body: JSON.stringify({
          type: 'insights'
        })
      });

      const result = await response.json();
      if (result.coaching) {
        setInsight(result.coaching);
      } else {
        setInsight("인사이트 분석에 실패했습니다.");
      }
    } catch (error) {
      setInsight("인사이트 분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateInsight();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="w-full max-w-lg bg-gray-800 border border-[var(--border-color)] rounded-2xl flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--point-green)]">AI 고급 인사이트</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <span className="spinner"></span>
            </div>
          ) : (
            <div className="text-left">
              <FormattedAiResponse text={insight} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border-color)]">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 text-white font-bold py-3 rounded-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedInsightModal;