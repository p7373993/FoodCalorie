'use client';

import React from 'react';

const WeeklyCalorieChart: React.FC = () => {
  // 샘플 데이터 (실제로는 API에서 가져올 데이터)
  const weeklyData = [
    { day: '월', kcal: 1800, target: 2000 },
    { day: '화', kcal: 2200, target: 2000 },
    { day: '수', kcal: 1900, target: 2000 },
    { day: '목', kcal: 2500, target: 2000 },
    { day: '금', kcal: 2300, target: 2000 },
    { day: '토', kcal: 2700, target: 2000 },
    { day: '일', kcal: 1600, target: 2000 },
  ];

  const maxKcal = Math.max(...weeklyData.map(d => Math.max(d.kcal, d.target))) + 200;

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 border border-gray-600">
      <h3 className="text-xl font-bold text-white mb-4">📊 주간 칼로리 섭취량</h3>
      
      <div className="flex justify-between items-end h-48 space-x-2 mb-4">
        {weeklyData.map((data, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end">
            <div className="w-full h-full flex items-end space-x-1">
              {/* 목표 칼로리 바 */}
              <div 
                className="w-1/2 bg-gray-600 rounded-t-md opacity-50" 
                style={{ 
                  height: `${(data.target / maxKcal) * 100}%`
                }}
              ></div>
              {/* 실제 칼로리 바 */}
              <div 
                className={`w-1/2 rounded-t-md transition-all duration-500 ${
                  data.kcal <= data.target ? 'bg-[var(--point-green)]' : 'bg-red-500'
                }`}
                style={{ 
                  height: `${(data.kcal / maxKcal) * 100}%`,
                  animationDelay: `${index * 100}ms` 
                }}
              ></div>
            </div>
            <span className="text-xs mt-2 text-gray-400">{data.day}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--point-green)] rounded"></div>
          <span>실제 섭취</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded"></div>
          <span>목표 칼로리</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
        <div className="text-sm text-gray-400 mb-1">이번 주 평균</div>
        <div className="text-lg font-bold text-white">
          {Math.round(weeklyData.reduce((sum, data) => sum + data.kcal, 0) / weeklyData.length)} kcal
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalorieChart; 