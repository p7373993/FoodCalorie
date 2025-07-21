'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getDaysInMonth, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { apiClient } from '@/lib/api';
import { MonthlyCalendar } from '@/types';
import { DailyReportModal } from './DailyReportModal';

export function InteractiveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<MonthlyCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 월 변경 함수
  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  // 달력 데이터 로드
  useEffect(() => {
    const loadCalendarData = async () => {
      setLoading(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const data = await apiClient.getMonthlyLogs(year, month);
        setCalendarData(data);
      } catch (error) {
        console.error('Failed to load calendar data:', error);
        setCalendarData(null);
      }
      setLoading(false);
    };

    loadCalendarData();
  }, [currentDate]);

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
  };

  // 달력 날짜 생성 (실제 달력처럼 1일의 요일에 맞춰 시작)
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay(); // 0(일)~6(토)

  // 앞쪽 빈 칸
  const leadingEmpty = Array.from({ length: startDay });
  // 날짜 배열
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return date;
  });
  // 뒤쪽 빈 칸 (마지막 날 이후)
  const totalCells = startDay + daysInMonth;
  const trailingEmpty = Array.from({ length: (7 - (totalCells % 7)) % 7 });

  // 식사별 색상
  const mealColors: Record<string, string> = {
    breakfast: '#FFD600', // 노랑
    lunch: '#00C853',     // 초록
    dinner: '#2979FF',    // 파랑
    snack: '#FF6D00',     // 주황
  };

  // 식사 인디케이터 렌더링 (세로 바)
  const renderMealBarsVertical = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = calendarData?.days[dateStr];
    const mealOrder: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!dayData) return (
      <div className="flex flex-col w-full h-full justify-center mt-4">
        {mealOrder.map((type, idx) => (
          <div key={type} className={`w-full h-2 rounded bg-gray-200 ${idx < 3 ? 'mb-1' : ''}`} />
        ))}
      </div>
    );
    // meals 배열을 type 순서대로 정렬
    const mealsSorted = mealOrder.map(type => dayData.meals.find(m => m.type === type) || { type, hasLog: false });
    return (
      <div className="flex flex-col w-full h-full justify-center mt-4">
        {mealsSorted.map((meal, idx) => (
          <div
            key={meal.type}
            className={`w-full h-2 rounded ${idx < 3 ? 'mb-1' : ''}`}
            style={{ background: meal.hasLog ? mealColors[meal.type] : '#E0E0E0' }}
          />
        ))}
      </div>
    );
  };

  // 요일 헤더
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div>
      {/* 헤더 */}
      <div className="rounded-2xl rounded-b-none bg-[#011936] text-white flex items-center justify-between mb-0 p-6">
        <h2 className="text-xl font-noto text-white">
          {format(currentDate, 'yyyy년 M월')}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 rounded-full border-2 border-white bg-[#011936] hover:bg-white hover:text-[#011936] transition-colors shadow"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => changeMonth('next')}
            className="p-2 rounded-full border-2 border-white bg-[#011936] hover:bg-white hover:text-[#011936] transition-colors shadow"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      {/* 본문 */}
      <div className="rounded-2xl rounded-t-none border-2 border-[#011936] bg-white shadow-lg p-8 -mt-2 h-full min-h-[400px] flex flex-col">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-base font-noto text-[#011936]">
                {day}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-2 flex-1 h-full min-h-[320px]">
            {/* 앞쪽 빈 칸 */}
            {leadingEmpty.map((_, idx) => (
              <div key={`empty-start-${idx}`} className="h-full" />
            ))}
            {/* 날짜 */}
            {calendarDays.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayData = calendarData?.days[dateStr];
              const hasLogs = dayData?.meals.some(meal => meal.hasLog);
              
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`
                    p-2 h-full flex-1 rounded-2xl border-2 border-[#011936] transition-colors relative flex flex-col items-stretch justify-start bg-white shadow-sm
                    ${isSameMonth(date, currentDate) 
                      ? 'hover:bg-[#F4FFFD]' 
                      : 'bg-[#F4FFFD] text-[#011936] opacity-60'
                    }
                    ${isToday(date) 
                      ? 'border-[#011936] bg-[#F4FFFD]' 
                      : 'border-[#011936]'
                    }
                    ${hasLogs ? 'ring-2 ring-[#011936] ring-opacity-30' : ''}
                  `}
                >
                  <span className="absolute left-1 top-1 text-xs font-bold text-[#011936]">{format(date, 'd')}</span>
                  <div className="flex-1 flex flex-col justify-center">
                    {renderMealBarsVertical(date)}
                  </div>
                </button>
              );
            })}
            {/* 뒤쪽 빈 칸 */}
            {trailingEmpty.map((_, idx) => (
              <div key={`empty-end-${idx}`} className="h-full" />
            ))}
          </div>
        </div>

      {/* 범례 */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-noto text-[#011936]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-2 rounded" style={{background: mealColors.breakfast}} />
          <span>아침</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-2 rounded" style={{background: mealColors.lunch}} />
          <span>점심</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-2 rounded" style={{background: mealColors.dinner}} />
          <span>저녁</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-2 rounded" style={{background: mealColors.snack}} />
          <span>간식</span>
        </div>
      </div>

      {/* 일일 리포트 모달 */}
      {selectedDate && (
        <DailyReportModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
} 