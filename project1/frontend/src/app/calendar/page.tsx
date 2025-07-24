'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Meal {
  id: string;
  imageUrl: string;
  calories: number;
  timestamp: Date;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealsByDate, setMealsByDate] = useState<{ [key: string]: Meal[] }>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const loadMeals = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const response = await fetch(`/api/meals/calendar/?year=${year}&month=${month}`);
        const meals = await response.json();
        
        // 날짜별로 그룹화
        const groupedMeals: { [key: string]: Meal[] } = {};
        meals.forEach((meal: any) => {
          const dateKey = meal.date;
          if (!groupedMeals[dateKey]) {
            groupedMeals[dateKey] = [];
          }
          groupedMeals[dateKey].push({
            id: meal.id,
            imageUrl: meal.image_url,
            calories: meal.calories,
            timestamp: new Date(meal.timestamp)
          });
        });
        
        setMealsByDate(groupedMeals);
      } catch (error) {
        console.error('Error loading meals:', error);
        // 에러 시 빈 데이터로 설정
        setMealsByDate({});
      }
    };

    loadMeals();
  }, [currentDate]);

  const handleBack = () => {
    router.push('/dashboard');
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const selectedMeals = selectedDate ? mealsByDate[selectedDate.toISOString().split('T')[0]] || [] : [];

  return (
    <div className="bg-grid-pattern text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col space-y-6 animate-fade-in">
        <header className="w-full flex justify-between items-center">
          <h1 className="text-4xl font-black" style={{ color: 'var(--point-green)' }}>식단 캘린더</h1>
          <button 
            onClick={handleBack} 
            className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            뒤로
          </button>
        </header>

        <div className="w-full bg-[var(--card-bg)] p-6 rounded-2xl">
          <div className="grid grid-cols-7 gap-2 text-center">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="font-bold">{day}</div>
            ))}
            {emptyDays.map(i => (
              <div key={`empty-${i}`}></div>
            ))}
            {calendarDays.map(day => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dateKey = date.toISOString().split('T')[0];
              const hasMeals = mealsByDate[dateKey]?.length > 0;
              
              return (
                <button 
                  key={day} 
                  onClick={() => setSelectedDate(date)} 
                  className={`p-2 rounded-lg relative ${
                    selectedDate?.getDate() === day ? 
                    'bg-[var(--point-green)] text-black' : 
                    'hover:bg-gray-700'
                  }`}
                >
                  {day}
                  {hasMeals && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDate && (
          <div className="w-full bg-[var(--card-bg)] p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4">
              {selectedDate.toLocaleDateString('ko-KR')} 식단
            </h2>
            {selectedMeals.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedMeals.map(meal => (
                  <div key={meal.id} className="relative rounded-lg overflow-hidden group">
                    <img 
                      src={meal.imageUrl} 
                      alt="식단" 
                      className="w-full h-32 object-cover" 
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50">
                      <p className="text-white text-sm font-bold">{meal.calories} kcal</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">이 날짜에는 기록된 식단이 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}