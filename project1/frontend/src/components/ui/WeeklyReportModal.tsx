import React, { useState, useEffect } from 'react';
import FormattedAiResponse from './FormattedAiResponse';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { 
      document.body.style.overflow = 'hidden'; 
    }
    return () => { 
      document.body.style.overflow = 'unset'; 
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) { 
      setIsLoading(true);
      // 하드코딩된 로딩 시뮬레이션
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="w-full max-w-lg bg-gray-800 border border-[var(--border-color)] rounded-2xl flex flex-col">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--point-green)]">주간 AI 리포트</h2>
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
            <div className="text-left text-white space-y-4">
              <h3 className="text-lg font-bold text-green-400 mb-4">📊 이번 주 영양 분석 리포트</h3>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-blue-400 mb-2">🎯 주간 목표 달성도</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>칼로리 목표:</span>
                    <span className="text-green-400">1,620 / 2,000 kcal (81%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>단백질 목표:</span>
                    <span className="text-yellow-400">81 / 120g (68%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>탄수화물 목표:</span>
                    <span className="text-blue-400">243 / 250g (97%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>지방 목표:</span>
                    <span className="text-red-400">36 / 65g (55%)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-green-400 mb-2">📈 주간 트렌드</h4>
                <ul className="text-sm space-y-1">
                  <li>• 평균 일일 칼로리: 1,620kcal (목표 대비 81%)</li>
                  <li>• 가장 높은 칼로리: 1,900kcal (7월 28일)</li>
                  <li>• 가장 낮은 칼로리: 1,100kcal (7월 31일)</li>
                  <li>• 식사 기록 일수: 7일 중 7일 (100%)</li>
                </ul>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-400 mb-2">💡 AI 조언</h4>
                <div className="text-sm space-y-2">
                  <p>🎉 <strong>잘하고 있어요!</strong> 이번 주 식사 기록을 꾸준히 하셨네요.</p>
                  <p>📊 <strong>칼로리:</strong> 목표 대비 81%로 양호하지만, 조금 더 균형잡힌 식사를 위해 단백질 섭취를 늘려보세요.</p>
                  <p>🥩 <strong>단백질:</strong> 현재 68% 달성으로 부족합니다. 닭가슴살, 생선, 콩류 등을 더 섭취해보세요.</p>
                  <p>🍚 <strong>탄수화물:</strong> 97% 달성으로 매우 좋습니다! 현재 수준을 유지하세요.</p>
                  <p>🥑 <strong>지방:</strong> 55% 달성으로 적절합니다. 건강한 지방 섭취를 위해 견과류나 아보카도를 추가해보세요.</p>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-purple-400 mb-2">🎯 다음 주 목표</h4>
                <ul className="text-sm space-y-1">
                  <li>• 일일 단백질 섭취량 100g 이상 달성</li>
                  <li>• 건강한 지방 섭취량 50g 이상 달성</li>
                  <li>• 식사 기록 7일 연속 유지</li>
                  <li>• 물 섭취량 하루 2L 이상</li>
                </ul>
              </div>
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

export default WeeklyReportModal;