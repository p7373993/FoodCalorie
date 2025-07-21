'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InteractiveCalendar } from '@/components/dashboard/InteractiveCalendar';
import { AICoachTip } from '@/components/dashboard/AICoachTip';
import { NutritionDonutChart } from '@/components/dashboard/NutritionDonutChart';
import { apiClient } from '@/lib/api';
import { Camera, Trash2, Calendar, Clock, Info } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [showTip, setShowTip] = useState(true);
  const [foodRecords, setFoodRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState({
    totalCalories: 0,
    totalCarbs: 0,
    totalProtein: 0,
    totalFat: 0
  });

  useEffect(() => {
    // 인증 확인
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 오늘 날짜 가져오기
        const today = new Date().toISOString().split('T')[0];
        
        // 오늘의 식사 기록 가져오기
        const dailyReport = await apiClient.getDailyReport(today);
        setFoodRecords(dailyReport.meals || []);
        
        // 영양소 통계 설정
        setDailyStats({
          totalCalories: dailyReport.totalCalories || 0,
          totalCarbs: dailyReport.totalCarbs || 0,
          totalProtein: dailyReport.totalProtein || 0,
          totalFat: dailyReport.totalFat || 0
        });
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
        setFoodRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // 식사 기록 삭제 기능
  const handleDelete = async (id: string | number) => {
    if (!window.confirm('정말로 이 식사 기록을 삭제하시겠습니까?')) return;
    
    try {
      await apiClient.deleteMealLog(id);
      setFoodRecords((prev) => prev.filter((rec) => rec.id !== id));
      
      // 삭제 후 통계 업데이트
      const deletedRecord = foodRecords.find(rec => rec.id === id);
      if (deletedRecord) {
        setDailyStats(prev => ({
          totalCalories: prev.totalCalories - (deletedRecord.calories || 0),
          totalCarbs: prev.totalCarbs - (deletedRecord.carbs || 0),
          totalProtein: prev.totalProtein - (deletedRecord.protein || 0),
          totalFat: prev.totalFat - (deletedRecord.fat || 0)
        }));
      }
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  };

  // 식사 유형 한글 변환
  const getMealTypeKorean = (type: string) => {
    const types: Record<string, string> = {
      'breakfast': '아침',
      'lunch': '점심',
      'dinner': '저녁',
      'snack': '간식'
    };
    return types[type] || type;
  };

  // 영양 등급에 따른 색상
  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'E': 'bg-red-500'
    };
    return colors[grade] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#011936]">대시보드</h1>
        <Link 
          href="/log" 
          className="btn-primary rounded-xl flex items-center gap-2 py-2 px-4"
        >
          <Camera size={18} />
          <span>식사 기록</span>
        </Link>
      </div>

      {/* AI 코치 팁 */}
      {showTip ? (
        <AICoachTip onClose={() => setShowTip(false)} />
      ) : (
        <button
          className="fixed right-4 bottom-4 z-50 rounded-full bg-[#011936] text-white p-3 shadow-lg"
          onClick={() => setShowTip(true)}
        >
          <Info size={24} />
        </button>
      )}

      {/* 오늘의 영양소 요약 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">오늘의 영양소</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="stat-card bg-gradient-to-r from-[#011936] to-[#233a50]">
              <div className="stat-number">{dailyStats.totalCalories} kcal</div>
              <div className="stat-label">총 칼로리</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card bg-blue-500">
                <div className="stat-number">{dailyStats.totalCarbs}g</div>
                <div className="stat-label">탄수화물</div>
              </div>
              <div className="stat-card bg-red-500">
                <div className="stat-number">{dailyStats.totalProtein}g</div>
                <div className="stat-label">단백질</div>
              </div>
              <div className="stat-card bg-yellow-500">
                <div className="stat-number">{dailyStats.totalFat}g</div>
                <div className="stat-label">지방</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <NutritionDonutChart 
              carbs={dailyStats.totalCarbs} 
              protein={dailyStats.totalProtein} 
              fat={dailyStats.totalFat} 
            />
          </div>
        </div>
      </div>

      {/* 달력 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">월간 식사 기록</h2>
        </div>
        <InteractiveCalendar />
      </div>

      {/* 오늘의 식사 기록 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">오늘의 식사</h2>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : foodRecords.length > 0 ? (
          <div className="space-y-4">
            {foodRecords.map((record) => (
              <div key={record.id} className="meal-card">
                {record.imageUrl ? (
                  <img 
                    src={record.imageUrl} 
                    alt={record.foodName} 
                    className="meal-image"
                  />
                ) : (
                  <div className="meal-image flex items-center justify-center bg-gray-100">
                    <Camera className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                
                <div className="meal-info">
                  <div className="flex items-center gap-2">
                    <h3 className="meal-name">{record.foodName}</h3>
                    {record.nutriScore && (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${getGradeColor(record.nutriScore)}`}>
                        {record.nutriScore}
                      </span>
                    )}
                  </div>
                  
                  <div className="meal-details flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {getMealTypeKorean(record.mealType)}
                    </span>
                    {record.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {record.time.substring(0, 5)}
                      </span>
                    )}
                    <span className="meal-calories">{record.calories} kcal</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDelete(record.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="삭제"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>오늘 기록된 식사가 없습니다.</p>
            <Link 
              href="/log" 
              className="mt-4 inline-block btn-secondary"
            >
              식사 기록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}