"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import UserInfo from "@/components/auth/UserInfo";
import { apiClient } from "@/lib/api";
import type {
  CalendarData,
  CalendarUserProfile,
  CalendarDailyLog,
  CalendarMeal,
} from "@/types/calendar";

// 상수 정의
const MEAL_TYPES = {
  Breakfast: { label: "아침", color: "bg-blue-400" },
  Lunch: { label: "점심", color: "bg-green-400" },
  Dinner: { label: "저녁", color: "bg-orange-400" },
  Snack: { label: "간식", color: "bg-purple-400" },
} as const;

const NUTRI_SCORE_COLORS = {
  A: "bg-green-600",
  B: "bg-yellow-600",
  C: "bg-orange-600",
  D: "bg-red-600",
  E: "bg-red-800",
} as const;

const PROGRESS_BAR_COLORS = {
  calories: "bg-blue-500",
  protein: "bg-green-500",
  carbs: "bg-yellow-500",
  fat: "bg-red-500",
} as const;

const GOAL_LIMITS = {
  calorie: { min: 1000, max: 5000 },
  protein: { min: 50, max: 300 },
  carbs: { min: 100, max: 500 },
  fat: { min: 30, max: 150 },
} as const;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 진행률 바 컴포넌트
const ProgressBar: React.FC<{
  label: string;
  current: number;
  goal: number;
  unit: string;
  colorClass: string;
}> = ({ label, current, goal, unit, colorClass }) => {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  return (
    <div className="bg-gray-800 p-3 rounded-lg w-full">
      <div className="flex justify-between items-baseline mb-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-300">
          {current.toFixed(0)} / {goal} {unit}
        </p>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClass} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// 목표 설정 모달 컴포넌트
const GoalModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  profile: CalendarUserProfile;
  onSave: (newProfile: Partial<CalendarUserProfile>) => void;
}> = ({ isOpen, onClose, profile, onSave }) => {
  const [goals, setGoals] = useState({
    calorie_goal: profile.calorie_goal,
    protein_goal: profile.protein_goal,
    carbs_goal: profile.carbs_goal,
    fat_goal: profile.fat_goal,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(goals);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-2xl max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-4">목표 설정</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              칼로리 목표 (kcal)
            </label>
            <input
              type="number"
              value={goals.calorie_goal}
              onChange={(e) =>
                setGoals({ ...goals, calorie_goal: parseInt(e.target.value) })
              }
              className="w-full p-2 bg-gray-700 text-white rounded-lg"
              min={GOAL_LIMITS.calorie.min}
              max={GOAL_LIMITS.calorie.max}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              단백질 목표 (g)
            </label>
            <input
              type="number"
              value={goals.protein_goal}
              onChange={(e) =>
                setGoals({ ...goals, protein_goal: parseInt(e.target.value) })
              }
              className="w-full p-2 bg-gray-700 text-white rounded-lg"
              min={GOAL_LIMITS.protein.min}
              max={GOAL_LIMITS.protein.max}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              탄수화물 목표 (g)
            </label>
            <input
              type="number"
              value={goals.carbs_goal}
              onChange={(e) =>
                setGoals({ ...goals, carbs_goal: parseInt(e.target.value) })
              }
              className="w-full p-2 bg-gray-700 text-white rounded-lg"
              min={GOAL_LIMITS.carbs.min}
              max={GOAL_LIMITS.carbs.max}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              지방 목표 (g)
            </label>
            <input
              type="number"
              value={goals.fat_goal}
              onChange={(e) =>
                setGoals({ ...goals, fat_goal: parseInt(e.target.value) })
              }
              className="w-full p-2 bg-gray-700 text-white rounded-lg"
              min={GOAL_LIMITS.fat.min}
              max={GOAL_LIMITS.fat.max}
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-500"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CalendarPage() {
  const router = useRouter();

  // 모든 state를 최상단에 선언
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // 식사 기록 삭제 함수
  const handleDeleteMeal = async (mealId: number, foodName: string) => {
    if (!confirm(`"${foodName}" 식사 기록을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      console.log('🗑️ 식사 기록 삭제 시작:', mealId);
      
      await apiClient.deleteMeal(mealId);
      
      console.log('✅ 식사 기록 삭제 성공');
      alert('식사 기록이 삭제되었습니다.');

      // 캘린더 데이터 새로고침
      await loadCalendarData();

    } catch (error) {
      console.error('❌ 식사 기록 삭제 실패:', error);
      alert('식사 기록 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 모든 계산된 값들을 useMemo로 처리
  const daysInMonth = useMemo(
    () =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate(),
    [currentDate]
  );

  const firstDayOfMonth = useMemo(
    () =>
      new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(),
    [currentDate]
  );

  const calendarDays = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );
  const emptyDays = useMemo(
    () => Array.from({ length: firstDayOfMonth }, (_, i) => i),
    [firstDayOfMonth]
  );

  // 일별 로그 정보 맵 생성
  const dailyLogInfo = useMemo(() => {
    console.log("🔄 dailyLogInfo 맵 생성 중...");
    console.log("calendarData:", calendarData);
    console.log("daily_logs:", calendarData?.daily_logs);

    if (!calendarData?.daily_logs) {
      console.log("❌ daily_logs가 없습니다.");
      return new Map();
    }

    const map = new Map<
      string,
      {
        mealTypes: Set<"Breakfast" | "Lunch" | "Dinner" | "Snack">;
        totalCalories: number;
        mealCount: number;
      }
    >();

    calendarData.daily_logs.forEach((log) => {
      console.log(`📅 처리 중인 날짜: ${log.date}, 식사 개수: ${log.meals?.length || 0}`);

      if (log.meals && log.meals.length > 0) {
        const mealTypes = log.meals.map((m) => m.type);
        console.log(`🍽️ ${log.date} 식사 타입들:`, mealTypes);

        // 🔧 날짜 키를 정확히 사용 (시간대 변환 없이)
        const dateKey = log.date; // 백엔드에서 온 날짜 문자열을 그대로 사용
        console.log(`🔑 사용할 날짜 키: ${dateKey}`);

        map.set(dateKey, {
          mealTypes: new Set(mealTypes),
          totalCalories: log.meals.reduce(
            (sum, meal) => sum + meal.nutrients.calories,
            0
          ),
          mealCount: log.meals.length,
        });

        console.log(`✅ ${dateKey} 맵에 추가됨:`, map.get(dateKey));
      }
    });

    console.log("🗺️ 최종 dailyLogInfo 맵:", map);
    return map;
  }, [calendarData?.daily_logs]);

  // 선택된 날짜의 영양소 정보
  const selectedDateNutrients = useMemo(() => {
    if (!calendarData?.daily_logs || !selectedDate) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    // 🔧 시간대 문제 해결: 로컬 시간 기준으로 날짜 문자열 생성
    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const selectedDateLog = calendarData.daily_logs.find(
      (log) => log.date === selectedDateStr
    );

    return selectedDateLog
      ? selectedDateLog.meals.reduce(
        (acc, meal) => {
          acc.calories += meal.nutrients.calories;
          acc.protein += meal.nutrients.protein;
          acc.carbs += meal.nutrients.carbs;
          acc.fat += meal.nutrients.fat;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )
      : { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }, [calendarData?.daily_logs, selectedDate]);

  // 목표 업데이트 핸들러
  const handleGoalUpdate = async (newGoals: Partial<CalendarUserProfile>) => {
    try {
      await apiClient.updateCalendarProfile(newGoals);
      if (calendarData) {
        setCalendarData({
          ...calendarData,
          user_profile: { ...calendarData.user_profile, ...newGoals },
        });
      }
    } catch (err) {
      console.error("Error updating goals:", err);
      alert("목표 업데이트에 실패했습니다.");
    }
  };

  // 캘린더 데이터 로드 useEffect (월 변경 시 새로 로딩)
  useEffect(() => {
    const loadCalendarData = async () => {
      try {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // JavaScript month는 0부터 시작
        console.log(`🔄 캘린더 데이터 로딩: ${year}년 ${month}월`);

        const data = await apiClient.getCalendarData(year, month);
        console.log("📊 받은 캘린더 데이터:", data);

        // 7월 31일 데이터 특별 확인
        if (data?.daily_logs) {
          const july31 = data.daily_logs.find(log => log.date === "2025-07-31");
          if (july31) {
            console.log("🔍 7월 31일 데이터 확인:", july31);
            console.log("🔍 7월 31일 식사 개수:", july31.meals?.length || 0);
          }
        }

        setCalendarData(data);
        setError(null);
      } catch (err) {
        console.error("❌ 캘린더 데이터 로드 에러:", err);
        setError("캘린더 데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [currentDate]); // currentDate 변경 시 데이터 다시 로드

  // 로딩 상태 렌더링
  if (loading) {
    return (
      <>
        <UserInfo />
        <div className="bg-gray-900 text-white min-h-screen p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
            <p className="text-gray-400">캘린더 데이터를 불러오는 중...</p>
          </div>
        </div>
      </>
    );
  }

  // 에러 상태 렌더링
  if (error || !calendarData) {
    return (
      <>
        <UserInfo />
        <div className="bg-gray-900 text-white min-h-screen p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-400 mb-4">
              {error || "데이터를 불러올 수 없습니다."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
            >
              다시 시도
            </button>
          </div>
        </div>
      </>
    );
  }

  const { user_profile, badges, daily_logs, weekly_analysis } = calendarData;

  return (
    <>
      <UserInfo />
      <div className="bg-gray-900 text-white min-h-screen p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex justify-between items-center">
            <h1 className="text-4xl font-black text-green-400">식단 캘린더</h1>
            <button
              onClick={() => {
                console.log("목표 설정 버튼 클릭됨");
                setShowGoalModal(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 cursor-pointer"
              type="button"
            >
              목표 설정
            </button>
          </header>

          {/* 오늘의 영양소 현황 */}
          <div className="bg-gray-800 p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-green-400">
              {selectedDate?.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }) || new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              식단
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ProgressBar
                label="칼로리"
                current={selectedDateNutrients.calories}
                goal={user_profile.calorie_goal}
                unit="kcal"
                colorClass={PROGRESS_BAR_COLORS.calories}
              />
              <ProgressBar
                label="단백질"
                current={selectedDateNutrients.protein}
                goal={user_profile.protein_goal}
                unit="g"
                colorClass={PROGRESS_BAR_COLORS.protein}
              />
              <ProgressBar
                label="탄수화물"
                current={selectedDateNutrients.carbs}
                goal={user_profile.carbs_goal}
                unit="g"
                colorClass={PROGRESS_BAR_COLORS.carbs}
              />
              <ProgressBar
                label="지방"
                current={selectedDateNutrients.fat}
                goal={user_profile.fat_goal}
                unit="g"
                colorClass={PROGRESS_BAR_COLORS.fat}
              />
            </div>
            {selectedDateNutrients.calories === 0 && (
              <p className="text-gray-400 mt-4 text-center">
                {selectedDate?.toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                }) || "오늘"}은 아직 기록된 식단이 없습니다.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 캘린더 */}
            <div className="bg-gray-800 p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">식사 캘린더</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setCurrentDate((prev) => {
                        const newDate = new Date(prev);
                        newDate.setMonth(prev.getMonth() - 1);
                        return newDate;
                      })
                    }
                    className="p-1 rounded-full hover:bg-gray-700 text-white"
                  >
                    &lt;
                  </button>
                  <span className="w-32 text-center font-semibold text-white">
                    {currentDate.toLocaleString("ko-KR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentDate((prev) => {
                        const newDate = new Date(prev);
                        newDate.setMonth(prev.getMonth() + 1);
                        return newDate;
                      })
                    }
                    className="p-1 rounded-full hover:bg-gray-700 text-white"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* 식사 타입별 색깔 범례 */}
              <div className="bg-gray-700 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-bold text-white mb-3 text-center">
                  식사 타입별 색상 가이드
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(MEAL_TYPES).map(([type, config]) => (
                    <div key={type} className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                      <div className={`w-4 h-4 rounded-full ${config.color} flex-shrink-0`}></div>
                      <span className="text-sm text-white font-medium">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-7 border-t border-l border-gray-600 flex-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-xs p-2 border-r border-b border-gray-600 text-gray-300"
                  >
                    {day}
                  </div>
                ))}
                {emptyDays.map((i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-r border-b border-gray-600"
                  ></div>
                ))}
                {calendarDays.map((day) => {
                  const date = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day
                  );
                  // 🔧 시간대 문제 해결: 로컬 시간 기준으로 날짜 문자열 생성
                  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  
                  // 🔧 시간대 문제 해결: 로컬 시간 기준으로 비교
                  const today = new Date();
                  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const isToday = todayKey === dateKey;
                  
                  // 🔧 선택된 날짜도 로컬 시간 기준으로 비교
                  const selectedDateKey = selectedDate ? 
                    `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : 
                    null;
                  const isSelected = selectedDateKey === dateKey;
                  const logInfo = dailyLogInfo.get(dateKey);

                  // 🔍 8월 1일 디버깅
                  if (day === 1 && currentDate.getMonth() === 7) { // 8월 (0-based)
                    console.log(`🔍 8월 1일 디버깅:`);
                    console.log(`  - day: ${day}`);
                    console.log(`  - date 객체:`, date);
                    console.log(`  - dateKey: ${dateKey}`);
                    console.log(`  - logInfo:`, logInfo);
                    console.log(`  - dailyLogInfo 전체:`, dailyLogInfo);
                  }

                  return (
                    <div
                      key={day}
                      className={`p-2 border-r border-b border-gray-600 min-h-[7rem] cursor-pointer transition-colors flex flex-col justify-between ${isSelected
                        ? "bg-green-600 hover:bg-green-500"
                        : "hover:bg-gray-700"
                        }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div>
                        <span
                          className={`text-sm ${isToday
                            ? "bg-yellow-500 text-black rounded-full h-6 w-6 flex items-center justify-center font-bold"
                            : isSelected
                              ? "text-white font-bold"
                              : "text-white"
                            }`}
                        >
                          {day}
                        </span>
                      </div>

                      {logInfo && (
                        <div className="text-right space-y-1">
                          <div className="flex justify-end space-x-1 mb-1">
                            {logInfo.mealTypes.has("Breakfast") && (
                              <div
                                className="w-3 h-3 rounded-full bg-blue-400 border border-white"
                                title="아침"
                              ></div>
                            )}
                            {logInfo.mealTypes.has("Lunch") && (
                              <div
                                className="w-3 h-3 rounded-full bg-green-400 border border-white"
                                title="점심"
                              ></div>
                            )}
                            {logInfo.mealTypes.has("Dinner") && (
                              <div
                                className="w-3 h-3 rounded-full bg-orange-400 border border-white"
                                title="저녁"
                              ></div>
                            )}
                            {logInfo.mealTypes.has("Snack") && (
                              <div
                                className="w-3 h-3 rounded-full bg-purple-400 border border-white"
                                title="간식"
                              ></div>
                            )}
                          </div>
                          <div className="text-xs">
                            <p className="font-bold text-green-300">
                              {Math.round(logInfo.totalCalories)} kcal
                            </p>
                            <p className="text-gray-300">
                              {logInfo.mealCount}끼
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 선택된 날짜의 식사 기록 */}
            <div className="bg-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {selectedDate
                  ? `${selectedDate.toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })} 식사 기록`
                  : "날짜를 선택하세요"}
              </h2>

              {(() => {
                if (!selectedDate) {
                  return (
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">📅</div>
                      <p>
                        캘린더에서 날짜를 선택하면 해당 날짜의 식사 기록을 볼 수
                        있습니다.
                      </p>
                    </div>
                  );
                }

                // 🔧 시간대 문제 해결: 로컬 시간 기준으로 날짜 문자열 생성
                const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                const selectedLog = daily_logs.find(
                  (log) => log.date === selectedDateKey
                );

                // 7월 31일 디버깅
                if (selectedDateKey === "2025-07-31") {
                  console.log("🔍 7월 31일 선택됨");
                  console.log("selectedLog:", selectedLog);
                  console.log("meals count:", selectedLog?.meals?.length || 0);
                  console.log("meals data:", selectedLog?.meals);

                  // 각 식사의 ID 확인
                  selectedLog?.meals?.forEach((meal, index) => {
                    console.log(`Meal ${index + 1}: ID=${meal.id}, Type=${meal.type}, Name=${meal.foodName}`);
                  });
                }

                if (!selectedLog || selectedLog.meals.length === 0) {
                  return (
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">🍽️</div>
                      <p>이 날에는 식사 기록이 없습니다.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* 식사 기록 */}
                    <div className="grid grid-cols-1 gap-3">
                      {selectedLog.meals.map((meal) => (
                        <div
                          key={meal.id}
                          className="bg-gray-700 rounded-lg overflow-hidden flex"
                        >
                          <img
                            src={meal.photo_url}
                            alt={meal.foodName}
                            className="w-20 h-20 object-cover flex-shrink-0"
                          />
                          <div className="p-3 flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-xs px-2 py-1 rounded-full text-white ${MEAL_TYPES[meal.type as keyof typeof MEAL_TYPES]?.color || "bg-gray-500"
                                  }`}
                              >
                                {MEAL_TYPES[meal.type as keyof typeof MEAL_TYPES]?.label || "기타"}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full text-white ${NUTRI_SCORE_COLORS[meal.nutrients.nutriScore as keyof typeof NUTRI_SCORE_COLORS] || "bg-gray-600"
                                  }`}
                              >
                                {meal.nutrients.nutriScore}
                              </span>
                            </div>
                            <h3 className="font-bold text-white text-sm mb-1">
                              {meal.foodName}
                            </h3>
                            <div className="text-xs text-gray-300 grid grid-cols-2 gap-1">
                              <div>
                                칼로리:{" "}
                                <span className="font-bold text-blue-400">
                                  {meal.nutrients.calories} kcal
                                </span>
                              </div>
                              <div>
                                단백질:{" "}
                                <span className="font-bold text-green-400">
                                  {meal.nutrients.protein}g
                                </span>
                              </div>
                              <div>
                                탄수화물:{" "}
                                <span className="font-bold text-yellow-400">
                                  {meal.nutrients.carbs}g
                                </span>
                              </div>
                              <div>
                                지방:{" "}
                                <span className="font-bold text-red-400">
                                  {meal.nutrients.fat}g
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-400 italic">
                              💬 {meal.ai_comment}
                            </div>
                          </div>
                          
                          {/* 삭제 버튼 */}
                          <div className="flex items-center justify-center p-2">
                            <button
                              onClick={() => handleDeleteMeal(meal.id, meal.foodName)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                              title="식사 기록 삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>



          {/* 배지 섹션 */}
          {badges.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-4 text-green-400">
                획득한 배지
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="text-center bg-gray-700 p-3 rounded-lg"
                  >
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <p className="text-xs font-bold text-white">{badge.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 목표 설정 모달 */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        profile={user_profile}
        onSave={handleGoalUpdate}
      />
    </>
  );
}
