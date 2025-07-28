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
              min="1000"
              max="5000"
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
              min="50"
              max="300"
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
              min="100"
              max="500"
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
              min="30"
              max="150"
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
    if (!calendarData?.daily_logs) return new Map();

    const map = new Map<
      string,
      {
        mealTypes: Set<"Breakfast" | "Lunch" | "Dinner" | "Snack">;
        totalCalories: number;
      }
    >();

    calendarData.daily_logs.forEach((log) => {
      if (log.meals && log.meals.length > 0) {
        map.set(log.date, {
          mealTypes: new Set(log.meals.map((m) => m.type)),
          totalCalories: log.meals.reduce(
            (sum, meal) => sum + meal.nutrients.calories,
            0
          ),
        });
      }
    });
    return map;
  }, [calendarData?.daily_logs]);

  // 오늘의 영양소 정보
  const todayNutrients = useMemo(() => {
    if (!calendarData?.daily_logs) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const todayLog = calendarData.daily_logs.find(
      (log) => log.date === new Date().toISOString().split("T")[0]
    );

    return todayLog
      ? todayLog.meals.reduce(
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
  }, [calendarData?.daily_logs]);

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

  // 캘린더 데이터 로드 useEffect
  useEffect(() => {
    const loadCalendarData = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getCalendarData();
        setCalendarData(data);
        setError(null);
      } catch (err) {
        console.error("Error loading calendar data:", err);
        setError("캘린더 데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, []);

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
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              식단
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ProgressBar
                label="칼로리"
                current={todayNutrients.calories}
                goal={user_profile.calorie_goal}
                unit="kcal"
                colorClass="bg-blue-500"
              />
              <ProgressBar
                label="단백질"
                current={todayNutrients.protein}
                goal={user_profile.protein_goal}
                unit="g"
                colorClass="bg-green-500"
              />
              <ProgressBar
                label="탄수화물"
                current={todayNutrients.carbs}
                goal={user_profile.carbs_goal}
                unit="g"
                colorClass="bg-yellow-500"
              />
              <ProgressBar
                label="지방"
                current={todayNutrients.fat}
                goal={user_profile.fat_goal}
                unit="g"
                colorClass="bg-red-500"
              />
            </div>
            {todayNutrients.calories === 0 && (
              <p className="text-gray-400 mt-4 text-center">
                오늘은 아직 기록된 식단이 없습니다.
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
                  <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-blue-400 flex-shrink-0"></div>
                    <span className="text-sm text-white font-medium">아침</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-green-400 flex-shrink-0"></div>
                    <span className="text-sm text-white font-medium">점심</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-orange-400 flex-shrink-0"></div>
                    <span className="text-sm text-white font-medium">저녁</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-purple-400 flex-shrink-0"></div>
                    <span className="text-sm text-white font-medium">간식</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 border-t border-l border-gray-600 flex-1">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
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
                  const dateKey = date.toISOString().split("T")[0];
                  const isToday =
                    new Date().toISOString().split("T")[0] === dateKey;
                  const logInfo = dailyLogInfo.get(dateKey);

                  return (
                    <div
                      key={day}
                      className="p-2 border-r border-b border-gray-600 min-h-[7rem] cursor-pointer hover:bg-gray-700 transition-colors flex flex-col justify-between"
                      onClick={() => setSelectedDate(date)}
                    >
                      <div>
                        <span
                          className={`text-sm ${
                            isToday
                              ? "bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center font-bold"
                              : "text-white"
                          }`}
                        >
                          {day}
                        </span>
                      </div>

                      {logInfo && (
                        <div className="text-right space-y-1">
                          <div className="flex justify-end space-x-1">
                            {logInfo.mealTypes.has("Breakfast") && (
                              <div
                                className="w-2 h-2 rounded-full bg-blue-400"
                                title="Breakfast"
                              ></div>
                            )}
                            {logInfo.mealTypes.has("Lunch") && (
                              <div
                                className="w-2 h-2 rounded-full bg-green-400"
                                title="Lunch"
                              ></div>
                            )}
                            {logInfo.mealTypes.has("Dinner") && (
                              <div
                                className="w-2 h-2 rounded-full bg-orange-400"
                                title="Dinner"
                              ></div>
                            )}
                            {logInfo.mealTypes.has("Snack") && (
                              <div
                                className="w-2 h-2 rounded-full bg-purple-400"
                                title="Snack"
                              ></div>
                            )}
                          </div>
                          <p className="text-xs font-bold text-green-400">
                            {logInfo.totalCalories.toLocaleString()} kcal
                          </p>
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

                const selectedDateKey = selectedDate
                  .toISOString()
                  .split("T")[0];
                const selectedLog = daily_logs.find(
                  (log) => log.date === selectedDateKey
                );

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
                                className={`text-xs px-2 py-1 rounded-full text-white ${
                                  meal.type === "Breakfast"
                                    ? "bg-blue-500"
                                    : meal.type === "Lunch"
                                    ? "bg-green-500"
                                    : meal.type === "Dinner"
                                    ? "bg-orange-500"
                                    : "bg-purple-500"
                                }`}
                              >
                                {meal.type === "Breakfast"
                                  ? "아침"
                                  : meal.type === "Lunch"
                                  ? "점심"
                                  : meal.type === "Dinner"
                                  ? "저녁"
                                  : "간식"}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full text-white ${
                                  meal.nutrients.nutriScore === "A"
                                    ? "bg-green-600"
                                    : meal.nutrients.nutriScore === "B"
                                    ? "bg-yellow-600"
                                    : meal.nutrients.nutriScore === "C"
                                    ? "bg-orange-600"
                                    : meal.nutrients.nutriScore === "D"
                                    ? "bg-red-600"
                                    : "bg-red-800"
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
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 주간 분석 섹션 */}
          {weekly_analysis && (
            <div className="bg-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-4 text-green-400">
                이번 주 분석
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">평균 칼로리</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {weekly_analysis.avg_calories.toFixed(0)} kcal
                  </p>
                  <p className="text-xs text-gray-500">
                    달성률:{" "}
                    {weekly_analysis.calorie_achievement_rate.toFixed(0)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">평균 단백질</p>
                  <p className="text-2xl font-bold text-green-400">
                    {weekly_analysis.avg_protein.toFixed(0)}g
                  </p>
                  <p className="text-xs text-gray-500">
                    달성률:{" "}
                    {weekly_analysis.protein_achievement_rate.toFixed(0)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">평균 탄수화물</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {weekly_analysis.avg_carbs.toFixed(0)}g
                  </p>
                  <p className="text-xs text-gray-500">
                    달성률: {weekly_analysis.carbs_achievement_rate.toFixed(0)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">평균 지방</p>
                  <p className="text-2xl font-bold text-red-400">
                    {weekly_analysis.avg_fat.toFixed(0)}g
                  </p>
                  <p className="text-xs text-gray-500">
                    달성률: {weekly_analysis.fat_achievement_rate.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-bold text-white mb-2">AI 조언</h3>
                <p className="text-gray-300 text-sm">
                  {weekly_analysis.ai_advice}
                </p>
              </div>
            </div>
          )}

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
