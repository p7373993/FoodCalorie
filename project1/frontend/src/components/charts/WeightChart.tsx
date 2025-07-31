import React from 'react';

interface WeightEntry {
  day: string;
  date: string;
  weight: number | null;
  has_record: boolean;
  is_today: boolean;
}

interface WeightChartProps {
  weights: WeightEntry[];
}

const WEIGHT_CONFIG = {
  MIN_VALID_WEIGHT: 30,
  MAX_VALID_WEIGHT: 200,
  CHART_PADDING: 0.1,
  MIN_RANGE: 0.8,
  HEIGHT_MIN: 20,
  HEIGHT_MAX: 80,
  HEIGHT_SCALE: 60
};

const WeightChart: React.FC<WeightChartProps> = ({ weights }) => {
  // 유효한 체중 데이터 필터링
  const validWeights = weights
    .filter(w => w.weight !== null && w.weight >= WEIGHT_CONFIG.MIN_VALID_WEIGHT && w.weight <= WEIGHT_CONFIG.MAX_VALID_WEIGHT)
    .map(w => w.weight!);

  if (validWeights.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">⚖️</div>
          <p className="text-lg">체중 기록이 없습니다</p>
          <p className="text-sm">체중을 기록해보세요!</p>
        </div>
      </div>
    );
  }

  // 체중 범위 계산
  const minWeight = Math.min(...validWeights) - WEIGHT_CONFIG.CHART_PADDING;
  const maxWeight = Math.max(...validWeights) + WEIGHT_CONFIG.CHART_PADDING;
  const weightRange = Math.max(maxWeight - minWeight, WEIGHT_CONFIG.MIN_RANGE);

  // 높이 계산 함수
  const calculateHeight = (weight: number): number => {
    const normalizedWeight = (weight - minWeight) / weightRange;
    return Math.max(
      WEIGHT_CONFIG.HEIGHT_MIN,
      Math.min(
        WEIGHT_CONFIG.HEIGHT_MAX,
        normalizedWeight * WEIGHT_CONFIG.HEIGHT_SCALE + WEIGHT_CONFIG.HEIGHT_MIN
      )
    );
  };

  // 체중 검증 함수
  const isValidWeight = (weight: number | null): boolean => {
    return weight !== null && weight > 0 && weight >= WEIGHT_CONFIG.MIN_VALID_WEIGHT && weight <= WEIGHT_CONFIG.MAX_VALID_WEIGHT;
  };

  return (
    <div className="relative bg-gray-900/20 rounded-xl p-4">
      <div className="grid grid-cols-7 gap-3 h-64 items-end relative">
        {weights.map((weightData, index) => {
          const weight = weightData.weight || 0;
          const isValid = isValidWeight(weightData.weight);
          const heightPercent = isValid ? calculateHeight(weight) : 0;

          return (
            <div key={index} className="flex flex-col h-full group relative">
              {/* 체중 포인트 영역 */}
              <div className="w-full h-full flex items-end justify-center relative">
                {isValid ? (
                  <div
                    className="w-full flex justify-center relative"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 shadow-lg transition-all duration-700 hover:scale-110 ${weightData.is_today
                          ? 'bg-green-400 border-green-200 ring-2 ring-white/30 animate-pulse'
                          : 'bg-blue-500 border-blue-300'
                        }`}
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        animationDelay: `${index * 100}ms`
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-1 bg-gray-600/30 rounded-full"></div>
                )}
              </div>

              {/* 하단 라벨 */}
              <div className="mt-3 text-center w-full h-16 flex flex-col justify-start">
                <div className={`text-sm font-bold ${weightData.is_today ? 'text-green-400' : 'text-gray-300'}`}>
                  {weightData.day}
                </div>
                {weightData.is_today && (
                  <div className="text-xs text-green-400 font-bold animate-pulse">오늘</div>
                )}
                {isValid ? (
                  <>
                    <div className="text-xs text-blue-400 mt-1 font-medium">기록됨</div>
                    <div className="text-xs text-gray-400 mt-1">{weight.toFixed(1)}kg</div>
                  </>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">기록없음</div>
                )}
              </div>

              {/* 호버 툴팁 */}
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 whitespace-nowrap pointer-events-none">
                <div className="font-bold text-center">{weightData.day}요일</div>
                {isValid ? (
                  <div className="text-center">{weight.toFixed(1)}kg</div>
                ) : (
                  <div className="text-center text-gray-400">기록없음</div>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex justify-center mt-8 space-x-8 text-sm bg-gray-800/30 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
          <span className="font-medium">체중 기록</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-400 rounded-full shadow-sm animate-pulse"></div>
          <span className="font-medium">오늘</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-600/30 rounded-full shadow-sm"></div>
          <span className="font-medium">기록없음</span>
        </div>
      </div>
    </div>
  );
};

export default WeightChart;