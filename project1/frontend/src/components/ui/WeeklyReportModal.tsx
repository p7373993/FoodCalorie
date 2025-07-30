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

  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) { 
      setIsLoading(true);
      loadWeeklyReport();
    }
  }, [isOpen]);

  const loadWeeklyReport = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/ai/coaching/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ type: 'weekly' })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('주간 리포트 데이터:', data);
        setReportData(data.data);
      } else {
        console.error('주간 리포트 로드 실패:', response.status);
        const errorData = await response.text();
        console.error('에러 상세:', errorData);
      }
    } catch (error) {
      console.error('주간 리포트 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="w-full max-w-lg bg-gray-800 border border-gray-600 rounded-2xl flex flex-col shadow-2xl">
        <div className="p-4 border-b border-gray-600 flex justify-between items-center">
          <h2 className="text-xl font-bold text-green-400">주간 AI 리포트</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              <span className="ml-3 text-white">AI가 주간 리포트를 생성하고 있습니다...</span>
            </div>
          ) : reportData ? (
            <div className="text-left text-white space-y-4">
              <h3 className="text-lg font-bold text-green-400 mb-4">📊 AI 주간 영양 분석 리포트</h3>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-blue-400 mb-2">🎯 주간 목표 달성도</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>평균 일일 칼로리:</span>
                    <span className="text-green-400">{reportData.avg_daily_calories}kcal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>총 식사 횟수:</span>
                    <span className="text-blue-400">{reportData.total_meals}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span>총 칼로리:</span>
                    <span className="text-yellow-400">{reportData.total_calories}kcal</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-green-400 mb-2">🥗 영양소 분석</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>탄수화물:</span>
                    <span className="text-blue-400">{reportData.nutrition_summary?.carbs || 0}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>단백질:</span>
                    <span className="text-green-400">{reportData.nutrition_summary?.protein || 0}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>지방:</span>
                    <span className="text-orange-400">{reportData.nutrition_summary?.fat || 0}g</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-purple-400 mb-2">🏆 음식 등급 분포</h4>
                <div className="flex space-x-2 text-sm">
                  {Object.entries(reportData.grade_distribution || {}).map(([grade, count]) => (
                    <div key={grade} className="text-center">
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        grade === 'A' ? 'bg-green-500' :
                        grade === 'B' ? 'bg-blue-500' :
                        grade === 'C' ? 'bg-yellow-500' :
                        grade === 'D' ? 'bg-orange-500' : 'bg-red-500'
                      }`}>
                        {grade}
                      </div>
                      <div className="text-xs mt-1">{count}개</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-400 mb-2">🤖 AI 분석 및 조언</h4>
                <div className="text-sm leading-relaxed">
                  {reportData.ai_analysis || "AI 분석을 생성하는 중입니다..."}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-white">
              <p>주간 리포트를 불러올 수 없습니다.</p>
              <button 
                onClick={loadWeeklyReport}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-600">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReportModal;