'use client';

import React from 'react';

interface ChartData {
  name: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-end p-4">
      {data.length > 0 ? (
        data.map((item, index) => (
          <div key={index} className="flex-1 mx-1 flex flex-col justify-end items-center">
            <div
              className="bg-blue-500 w-full rounded-t-md"
              style={{ height: `${item.value / Math.max(...data.map(d => d.value)) * 100}%` }}
            ></div>
            <span className="text-xs mt-1">{item.name}</span>
          </div>
        ))
      ) : (
        <p className="text-center w-full text-muted-foreground">데이터가 없습니다.</p>
      )}
    </div>
  );
};

interface PieChartProps {
  data: ChartData[];
}

export const PieChart: React.FC<PieChartProps> = ({ data }) => {
  // 간단한 더미 파이 차트
  return (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      {data.length > 0 ? (
        <p className="text-center text-foreground">파이 차트 데이터: {JSON.stringify(data)}</p>
      ) : (
        <p className="text-center text-muted-foreground">데이터가 없습니다.</p>
      )}
    </div>
  );
};
