'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface NutritionDonutChartProps {
  carbs: number;
  protein: number;
  fat: number;
}

export function NutritionDonutChart({ carbs, protein, fat }: NutritionDonutChartProps) {
  // 데이터가 모두 0인 경우 기본값 설정
  const total = carbs + protein + fat;
  const data = total === 0 
    ? [
        { name: '탄수화물', value: 1, color: '#3b82f6' },
        { name: '단백질', value: 1, color: '#ef4444' },
        { name: '지방', value: 1, color: '#f59e0b' }
      ]
    : [
        { name: '탄수화물', value: carbs, color: '#3b82f6' },
        { name: '단백질', value: protein, color: '#ef4444' },
        { name: '지방', value: fat, color: '#f59e0b' }
      ];

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b'];
  
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-md">
          <p className="font-bold">{payload[0].name}: {payload[0].value}g</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            formatter={(value, entry, index) => (
              <span className="text-sm font-medium">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}