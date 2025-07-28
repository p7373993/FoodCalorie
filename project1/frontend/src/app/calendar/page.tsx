"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import UserInfo from '@/components/auth/UserInfo';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { createMockData } from "@/lib/diet-data";
import type {
  UserProfile,
  Badge,
  DailyLog,
  DietMeal,
} from "@/types/diet-profile";

interface Meal {
  id: string;
  imageUrl: string;
  calories: number;
  timestamp: Date;
}

// AI 다이어트 프로필 컴포넌트들
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = payload[0].payload.date || label;
    return (
      <div className="p-3 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-700">
        <p className="label font-bold text-sm mb-2">
          {new Date(date).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        {payload.map((pld: any) => (
          <div
            key={pld.dataKey}
            style={{ color: pld.stroke || pld.fill }}
            className="flex justify-between items-center text-xs py-0.5"
          >
            <span>{pld.name}:</span>
            <span className="font-bold ml-4">{`${pld.value.toFixed(0)} ${
              pld.unit || (pld.dataKey === "calories" ? "kcal" : "g")
            }`}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CalorieNutrientChart: React.FC<{
  logs: DailyLog[];
  calorieGoal: number;
}> = ({ logs, calorieGoal }) => {
  const chartData = useMemo(() => {
    const recentLogs = logs.slice(-30);
    return recentLogs.map((log) => {
      const totals = log.meals.reduce(
        (acc, meal) => {
          acc.calories += meal.nutrients.calories;
          acc.carbs += meal.nutrients.carbs;
          acc.protein += meal.nutrients.protein;
          acc.fat += meal.nutrients.fat;
          return acc;
        },
        { calories: 0, carbs: 0, protein: 0, fat: 0 }
      );

      return {
        name: new Date(log.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        date: log.date,
        ...totals,
      };
    });
  }, [logs]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -25, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#374151"
          />
          <XAxis
            dataKey="name"
            fontSize={12}
            stroke="#9CA3AF"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            stroke="#4F46E5"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            unit="kcal"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10B981"
            fontSize={12}
            unit="g"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(79, 70, 229, 0.1)" }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconSize={10}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <ReferenceLine
            yAxisId="left"
            y={calorieGoal}
            label={{
              value: `목표`,
              position: "insideTopLeft",
              fill: "#6B7280",
              fontSize: 10,
            }}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="protein"
            name="단백질"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            unit="g"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="fat"
            name="지방"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            unit="g"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="calories"
            name="칼로리"
            stroke="#4F46E5"
            strokeWidth={2.5}
            activeDot={{ r: 6 }}
            unit="kcal"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="carbs"
            name="탄수화물"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
            unit="g"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const NutrientRatioChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
  const ratioData = useMemo(() => {
    const totals = logs.slice(-30).reduce(
      (acc, log) => {
        log.meals.forEach((meal) => {
          acc.carbs += meal.nutrients.carbs;
          acc.protein += meal.nutrients.protein;
          acc.fat += meal.nutrients.fat;
        });
        return acc;
      },
      { carbs: 0, protein: 0, fat: 0 }
    );

    const totalGrams = totals.carbs + totals.protein + totals.fat;
    if (totalGrams === 0) return [];

    return [
      { name: "탄수화물", value: totals.carbs, color: "#F59E0B" },
      { name: "단백질", value: totals.protein, color: "#10B981" },
      { name: "지방", value: totals.fat, color: "#EF4444" },
    ];
  }, [logs]);

  if (ratioData.length === 0) return null;

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={ratioData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
          >
            {ratioData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealsByDate, setMealsByDate] = useState<{ [key: string]: Meal[] }>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // AI 다이어트 프로필 데이터
  const { userProfile, badges, dailyLogs } = createMockData();

  useEffect(() => {
    const loadMeals = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const response = await fetch(
          `/api/meals/calendar/?year=${year}&month=${month}`
        );
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
            timestamp: new Date(meal.timestamp),
          });
        });

        setMealsByDate(groupedMeals);
      } catch (error) {
        console.error("Error loading meals:", error);
        // 에러 시 빈 데이터로 설정
        setMealsByDate({});
      }
    };

    loadMeals();
  }, [currentDate]);

  const handleBack = () => {
    router.push("/dashboard");
  };

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const selectedMeals = selectedDate
    ? mealsByDate[selectedDate.toISOString().split("T")[0]] || []
    : [];

  // AI 다이어트 프로필 데이터 처리
  const dailyLogInfo = useMemo(() => {
    const map = new Map<
      string,
      {
        mealTypes: Set<"Breakfast" | "Lunch" | "Dinner" | "Snack">;
        totalCalories: number;
      }
    >();
    dailyLogs.forEach((log) => {
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
  }, [dailyLogs]);

  // 오늘의 영양소 정보
  const todayLog = dailyLogs.find(
    (log) => log.date === new Date().toISOString().split("T")[0]
  );
  const todayNutrients = todayLog
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

  return (
    <>
      <UserInfo />
      <div className="bg-gray-900 text-white min-h-screen p-4">
        <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-4xl font-black text-green-400">식단 캘린더</h1>

        </header>

        {/* 오늘의 영양소 현황 */}
        <div className="bg-gray-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4 text-green-400">
            2025. 7. 25. 식단
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ProgressBar
              label="칼로리"
              current={todayNutrients.calories}
              goal={userProfile.calorieGoal}
              unit="kcal"
              colorClass="bg-blue-500"
            />
            <ProgressBar
              label="단백질"
              current={todayNutrients.protein}
              goal={userProfile.nutrientGoals.protein}
              unit="g"
              colorClass="bg-green-500"
            />
            <ProgressBar
              label="탄수화물"
              current={todayNutrients.carbs}
              goal={userProfile.nutrientGoals.carbs}
              unit="g"
              colorClass="bg-yellow-500"
            />
            <ProgressBar
              label="지방"
              current={todayNutrients.fat}
              goal={userProfile.nutrientGoals.fat}
              unit="g"
              colorClass="bg-red-500"
            />
          </div>
          <p className="text-gray-400 mt-4 text-center">
            이 날짜에는 기록된 식단이 없습니다.
          </p>
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
                  <span className="text-xs text-gray-300">Breakfast</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-green-400 flex-shrink-0"></div>
                  <span className="text-sm text-white font-medium">점심</span>
                  <span className="text-xs text-gray-300">Lunch</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-orange-400 flex-shrink-0"></div>
                  <span className="text-sm text-white font-medium">저녁</span>
                  <span className="text-xs text-gray-300">Dinner</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-600 p-2 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-purple-400 flex-shrink-0"></div>
                  <span className="text-sm text-white font-medium">간식</span>
                  <span className="text-xs text-gray-300">Snack</span>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-400">
                  💡 캘린더의 각 날짜에서 색깔 점으로 식사 타입을 확인할 수
                  있습니다
                </p>
              </div>
            </div>

            <div className="grid grid-cols-7 border-t border-l border-gray-600">
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

              const selectedDateKey = selectedDate.toISOString().split("T")[0];
              const selectedLog = dailyLogs.find(
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

              // 선택된 날짜의 총 영양소 계산
              const dayTotals = selectedLog.meals.reduce(
                (acc, meal) => {
                  acc.calories += meal.nutrients.calories;
                  acc.protein += meal.nutrients.protein;
                  acc.carbs += meal.nutrients.carbs;
                  acc.fat += meal.nutrients.fat;
                  return acc;
                },
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
              );

              const calorieProgress =
                (dayTotals.calories / userProfile.calorieGoal) * 100;
              const proteinProgress =
                (dayTotals.protein / userProfile.nutrientGoals.protein) * 100;
              const carbsProgress =
                (dayTotals.carbs / userProfile.nutrientGoals.carbs) * 100;
              const fatProgress =
                (dayTotals.fat / userProfile.nutrientGoals.fat) * 100;

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
                          src={meal.photoUrl}
                          alt={meal.name}
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
                            {meal.name}
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
                            💬 {meal.aiComment}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 일일 목표 달성률 */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-white mb-3">
                      목표 달성률
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-300">칼로리</span>
                        <span className="text-xs text-blue-400 font-bold">
                          {dayTotals.calories} / {userProfile.calorieGoal} kcal
                          ({calorieProgress.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            calorieProgress >= 80 && calorieProgress <= 120
                              ? "bg-green-500"
                              : calorieProgress < 80
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(calorieProgress, 100)}%`,
                          }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                        <div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">단백질</span>
                            <span className="text-green-400 font-bold">
                              {proteinProgress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{
                                width: `${Math.min(proteinProgress, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">탄수화물</span>
                            <span className="text-yellow-400 font-bold">
                              {carbsProgress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                            <div
                              className="bg-yellow-500 h-1 rounded-full"
                              style={{
                                width: `${Math.min(carbsProgress, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">지방</span>
                            <span className="text-red-400 font-bold">
                              {fatProgress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                            <div
                              className="bg-red-500 h-1 rounded-full"
                              style={{
                                width: `${Math.min(fatProgress, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 일일 종합 평가 */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-white">
                        일일 종합 평가
                      </h3>
                      <span
                        className={`text-2xl font-bold ${(() => {
                          const avgScore =
                            selectedLog.meals.reduce((sum, meal) => {
                              const scoreValue =
                                meal.nutrients.nutriScore === "A"
                                  ? 5
                                  : meal.nutrients.nutriScore === "B"
                                  ? 4
                                  : meal.nutrients.nutriScore === "C"
                                  ? 3
                                  : meal.nutrients.nutriScore === "D"
                                  ? 2
                                  : 1;
                              return sum + scoreValue;
                            }, 0) / selectedLog.meals.length;

                          if (avgScore >= 4.5) return "text-green-400";
                          if (avgScore >= 3.5) return "text-blue-400";
                          if (avgScore >= 2.5) return "text-yellow-400";
                          return "text-orange-400";
                        })()}`}
                      >
                        {(() => {
                          const avgScore =
                            selectedLog.meals.reduce((sum, meal) => {
                              const scoreValue =
                                meal.nutrients.nutriScore === "A"
                                  ? 5
                                  : meal.nutrients.nutriScore === "B"
                                  ? 4
                                  : meal.nutrients.nutriScore === "C"
                                  ? 3
                                  : meal.nutrients.nutriScore === "D"
                                  ? 2
                                  : 1;
                              return sum + scoreValue;
                            }, 0) / selectedLog.meals.length;

                          if (avgScore >= 4.5) return "A";
                          if (avgScore >= 3.5) return "B";
                          if (avgScore >= 2.5) return "C";
                          return "D";
                        })()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      {(() => {
                        const avgScore =
                          selectedLog.meals.reduce((sum, meal) => {
                            const scoreValue =
                              meal.nutrients.nutriScore === "A"
                                ? 5
                                : meal.nutrients.nutriScore === "B"
                                ? 4
                                : meal.nutrients.nutriScore === "C"
                                ? 3
                                : meal.nutrients.nutriScore === "D"
                                ? 2
                                : 1;
                            return sum + scoreValue;
                          }, 0) / selectedLog.meals.length;

                        const calorieStatus =
                          calorieProgress >= 80 && calorieProgress <= 120
                            ? "good"
                            : calorieProgress < 80
                            ? "low"
                            : "high";

                        if (avgScore >= 4.5 && calorieStatus === "good") {
                          return "완벽한 하루였습니다! 영양 균형과 칼로리 모두 훌륭해요.";
                        } else if (
                          avgScore >= 3.5 &&
                          calorieStatus !== "high"
                        ) {
                          return "좋은 식단이에요! 조금만 더 신경쓰면 완벽할 것 같아요.";
                        } else if (avgScore >= 2.5) {
                          return "괜찮은 하루였어요. 더 건강한 선택을 늘려보세요.";
                        } else {
                          return "내일은 더 건강한 식단을 시도해보세요!";
                        }
                      })()}
                    </p>
                    <div className="mt-2 text-xs text-gray-400">
                      총 {selectedLog.meals.length}끼 식사 • 평균 영양 등급:{" "}
                      {(
                        selectedLog.meals.reduce((sum, meal) => {
                          const scoreValue =
                            meal.nutrients.nutriScore === "A"
                              ? 5
                              : meal.nutrients.nutriScore === "B"
                              ? 4
                              : meal.nutrients.nutriScore === "C"
                              ? 3
                              : meal.nutrients.nutriScore === "D"
                              ? 2
                              : 1;
                          return sum + scoreValue;
                        }, 0) / selectedLog.meals.length
                      ).toFixed(1)}
                      /5.0
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 칼로리 및 영양소 트렌드 차트 */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            칼로리 및 영양소 트렌드 (30일)
          </h2>
          <CalorieNutrientChart
            logs={dailyLogs}
            calorieGoal={userProfile.calorieGoal}
          />
        </div>

        {/* 뱃지 컬렉션 */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">뱃지 컬렉션</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center text-center"
                title={badge.description}
              >
                <div className="text-5xl mb-1">{badge.icon}</div>
                <p className="text-xs font-medium text-gray-300">
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
