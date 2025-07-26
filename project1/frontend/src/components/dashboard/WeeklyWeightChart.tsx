'use client';

import React from 'react';

const WeeklyWeightChart: React.FC = () => {
  // 샘플 데이터 (실제로는 API에서 가져올 데이터)
  const weeklyData = [
    { day: '월', weight: 70.2 },
    { day: '화', weight: 70.1 },
    { day: '수', weight: 69.8 },
    { day: '목', weight: 69.9 },
    { day: '금', weight: 69.7 },
    { day: '토', weight: 69.5 },
    { day: '일', weight: 69.3 },
  ];

  const minWeight = Math.min(...weeklyData.map(d => d.weight));
  const maxWeight = Math.max(...weeklyData.map(d => d.weight));
  const weightRange = maxWeight - minWeight;

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
      <h3 className="text-xl font-bold text-white mb-4">⚖️ 주간 체중 변화</h3>
      
      <div className="flex justify-between items-end h-48 space-x-2 mb-4">
        {weeklyData.map((data, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end">
            <div className="w-full h-full flex items-end">
              <div 
                className="w-full bg-blue-500 rounded-t-md transition-all duration-500" 
                style={{ 
                  height: `${((data.weight - minWeight) / weightRange) * 100}%`,
                  animationDelay: `${index * 100}ms` 
                }}
              ></div>
            </div>
            <span className="text-xs mt-2 text-gray-400">{data.day}</span>
            <span className="text-xs text-blue-400 font-medium">{data.weight}kg</span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
        <div className="text-sm text-gray-400 mb-1">이번 주 변화</div>
        <div className="text-lg font-bold text-white">
          {weeklyData.length > 1 ? 
            `${(weeklyData[weeklyData.length - 1].weight - weeklyData[0].weight).toFixed(1)}kg` : 
            '0.0kg'
          }
        </div>
        <div className="text-xs text-gray-400">
          {weeklyData.length > 1 && 
            (weeklyData[weeklyData.length - 1].weight - weeklyData[0].weight) < 0 ? 
            '감소' : '증가'
          }
        </div>
      </div>
    </div>
  );
};

export default WeeklyWeightChart; 