
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { UserProfile, Badge, DailyLog, Meal } from '../lib/types';
import { generateDietReport, generateDailySummary } from '../lib/actions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ReferenceLine, PieChart, Pie, Cell } from 'recharts';

// --- PROPS ---
interface ProfileDashboardProps {
    userProfile: UserProfile;
    badges: Badge[];
    dailyLogs: DailyLog[];
}

// --- ICONS (as components) ---
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 16l-4 4m14-10l-2.293-2.293a1 1 0 00-1.414 0L10 10.586 8.707 9.293a1 1 0 00-1.414 0L3 14" /></svg>
);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);


// --- HELPER & UI COMPONENTS ---

const ProgressBar: React.FC<{ label: string; current: number; goal: number; unit: string; colorClass: string; }> = ({ label, current, goal, unit, colorClass }) => {
    const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    return (
        <div className="bg-light-bg dark:bg-dark-bg p-3 rounded-lg w-full">
            <div className="flex justify-between items-baseline mb-1">
                <p className="text-sm font-medium text-text-main dark:text-dark-text-main">{label}</p>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary">{current.toFixed(0)} / {goal} {unit}</p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`${colorClass} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-card-bg dark:bg-dark-card-bg rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-card-bg dark:bg-dark-card-bg p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-main dark:text-dark-text-main">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

interface ProfileHeaderProps { user: UserProfile; }
const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => (
    <div className="text-center p-6 bg-white dark:bg-dark-card-bg rounded-xl shadow-md">
        <Image src={user.avatarUrl} alt="User Avatar" width={96} height={96} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-brand-primary" />
        <h1 className="text-2xl font-bold text-text-main dark:text-dark-text-main">@{user.name}</h1>
        <p className="text-text-secondary dark:text-dark-text-secondary mt-1">나의 뱃지와 챌린지 기록을 확인하세요</p>
    </div>
);

interface MyStatsProps { logs: DailyLog[]; }
const MyStats: React.FC<MyStatsProps> = ({ logs }) => {
    const totalRecords = logs.reduce((acc, log) => acc + log.meals.length, 0);
    const totalCalories = logs.reduce((acc, log) => acc + log.meals.reduce((sum, meal) => sum + meal.nutrients.calories, 0), 0);
    const avgCalories = totalRecords > 0 ? Math.round(totalCalories / logs.filter(l => l.meals.length > 0).length) : 0;
    const recentMeals = logs.flatMap(log => log.meals.map(meal => ({...meal, date: log.date}))).slice(-3).reverse();

    return (
        <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-text-main dark:text-dark-text-main mb-4">나의 통계</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg text-center">
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">총 기록</p>
                    <p className="text-2xl font-bold text-brand-primary">{totalRecords}</p>
                </div>
                <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg text-center">
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">총 섭취 칼로리</p>
                    <p className="text-2xl font-bold text-brand-primary">{totalCalories.toLocaleString()}</p>
                </div>
                <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg text-center">
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">평균 섭취 칼로리</p>
                    <p className="text-2xl font-bold text-brand-primary">{avgCalories.toLocaleString()}</p>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-text-main dark:text-dark-text-main mb-3">최근 식사 기록</h3>
            <ul className="space-y-2">
                {recentMeals.map(meal => (
                    <li key={meal.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-light-bg dark:bg-dark-bg">
                        <div>
                            <p className="font-medium text-text-main dark:text-dark-text-main">{meal.name}</p>
                            <p className="text-text-secondary dark:text-dark-text-secondary">{new Date(meal.date).toLocaleDateString()}</p>
                        </div>
                        <p className="font-semibold text-brand-secondary">{meal.nutrients.calories} kcal</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface MealCalendarProps { logs: DailyLog[]; onDateClick: (date: string) => void; }
const MealCalendar: React.FC<MealCalendarProps> = ({ logs, onDateClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const dailyLogInfo = useMemo(() => {
        const map = new Map<string, {
            mealTypes: Set<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>;
            totalCalories: number;
        }>();
        logs.forEach(log => {
            if (log.meals && log.meals.length > 0) {
                map.set(log.date, {
                    mealTypes: new Set(log.meals.map(m => m.type)),
                    totalCalories: log.meals.reduce((sum, meal) => sum + meal.nutrients.calories, 0)
                });
            }
        });
        return map;
    }, [logs]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + offset);
            return newDate;
        });
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="border-r border-b border-gray-200 dark:border-gray-700"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const logInfo = dailyLogInfo.get(dateStr);

            cells.push(
                <div 
                    key={day} 
                    className="p-2 border-r border-b border-gray-200 dark:border-gray-700 min-h-[7rem] cursor-pointer hover:bg-light-bg dark:hover:bg-gray-800 transition-colors flex flex-col justify-between" 
                    onClick={() => onDateClick(dateStr)}
                >
                    <div>
                         <span className={`text-sm ${isToday ? 'bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center font-bold' : 'text-text-main dark:text-dark-text-main'}`}>{day}</span>
                    </div>
                   
                    {logInfo && (
                        <div className="text-right space-y-1">
                            <div className="flex justify-end space-x-1" aria-label="Meals recorded">
                                {logInfo.mealTypes.has('Breakfast') && <div className="w-2 h-2 rounded-full bg-blue-400" title="Breakfast"></div>}
                                {logInfo.mealTypes.has('Lunch') && <div className="w-2 h-2 rounded-full bg-green-400" title="Lunch"></div>}
                                {logInfo.mealTypes.has('Dinner') && <div className="w-2 h-2 rounded-full bg-orange-400" title="Dinner"></div>}
                                {logInfo.mealTypes.has('Snack') && <div className="w-2 h-2 rounded-full bg-purple-400" title="Snack"></div>}
                            </div>
                            <p className="text-xs font-bold text-brand-secondary">{logInfo.totalCalories.toLocaleString()} kcal</p>
                        </div>
                    )}
                </div>
            );
        }
        return cells;
    };

    return (
        <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-text-main dark:text-dark-text-main">식사 캘린더</h2>
                <div className="flex items-center space-x-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&lt;</button>
                    <span className="w-32 text-center font-semibold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&gt;</button>
                </div>
            </div>
            <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-semibold text-xs p-2 border-r border-b border-gray-200 dark:border-gray-700 text-text-secondary dark:text-dark-text-secondary">{day}</div>
                ))}
                {renderCalendar()}
            </div>
        </div>
    );
};

// --- CHART COMPONENTS ---

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const date = payload[0].payload.date || label;
        return (
            <div className="p-3 bg-white dark:bg-gray-800 text-text-main dark:text-dark-text-main rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className="label font-bold text-sm mb-2">{new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {payload.map((pld: any) => (
                    <div key={pld.dataKey} style={{ color: pld.stroke || pld.fill }} className="flex justify-between items-center text-xs py-0.5">
                        <span>{pld.name}:</span>
                        <span className="font-bold ml-4">{`${pld.value.toFixed(0)} ${pld.unit || (pld.dataKey === 'calories' ? 'kcal' : 'g')}`}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

interface CalorieNutrientChartProps {
    logs: DailyLog[];
    calorieGoal: number;
    onDateClick: (date: string) => void;
}

const CalorieNutrientChart: React.FC<CalorieNutrientChartProps> = ({ logs, calorieGoal, onDateClick }) => {
    const chartData = useMemo(() => {
        const recentLogs = logs.slice(-30);
        return recentLogs.map(log => {
            const totals = log.meals.reduce((acc, meal) => {
                acc.calories += meal.nutrients.calories;
                acc.carbs += meal.nutrients.carbs;
                acc.protein += meal.nutrients.protein;
                acc.fat += meal.nutrients.fat;
                return acc;
            }, { calories: 0, carbs: 0, protein: 0, fat: 0 });

            return {
                name: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                date: log.date,
                ...totals
            };
        });
    }, [logs]);

    const calorieStats = useMemo(() => {
        const calories = chartData.map(d => d.calories).filter(c => c > 0);
        if (calories.length === 0) return { mean: 0, stdDev: 0 };
        const mean = calories.reduce((a, b) => a + b) / calories.length;
        const stdDev = Math.sqrt(calories.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / calories.length);
        return { mean, stdDev };
    }, [chartData]);
    
    const OutlierDot: React.FC<any> = ({ cx, cy, payload }) => {
        const isOutlier = Math.abs(payload.calories - calorieStats.mean) > 1.5 * calorieStats.stdDev && payload.calories > 0;
        if (isOutlier) {
            return (
                <g onClick={() => onDateClick(payload.date)} style={{ cursor: 'pointer' }}>
                   <circle cx={cx} cy={cy} r={10} fill="rgba(239, 68, 68, 0.3)" />
                   <circle cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#fff" strokeWidth={1} />
                </g>
            );
        }
        return null;
    };


    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" fontSize={12} stroke="currentColor" className="text-text-secondary dark:text-dark-text-secondary" tickLine={false} axisLine={false}/>
                    <YAxis yAxisId="left" orientation="left" stroke="#4F46E5" fontSize={12} tickLine={false} axisLine={false} unit="kcal" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={12} unit="g" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}/>
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                    <ReferenceLine yAxisId="left" y={calorieGoal} label={{ value: `목표`, position: 'insideTopLeft', fill: '#6B7280', fontSize: 10 }} stroke="#9CA3AF" strokeDasharray="4 4" />
                    <Line yAxisId="right" type="monotone" dataKey="protein" name="단백질" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} unit="g" />
                    <Line yAxisId="right" type="monotone" dataKey="fat" name="지방" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} unit="g" />
                    <Line yAxisId="left" type="monotone" dataKey="calories" name="칼로리" stroke="#4F46E5" strokeWidth={2.5} activeDot={{ r: 6 }} unit="kcal" dot={<OutlierDot />} />
                    <Line yAxisId="right" type="monotone" dataKey="carbs" name="탄수화물" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 6 }} unit="g" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


const WeeklyAverageChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    const weeklyData = useMemo(() => {
        const getWeekStartDate = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            return new Date(date.setDate(diff));
        };

        const groupedByWeek: { [key: string]: DailyLog[] } = {};
        logs.forEach(log => {
            const weekStart = getWeekStartDate(new Date(log.date)).toISOString().split('T')[0];
            if (!groupedByWeek[weekStart]) {
                groupedByWeek[weekStart] = [];
            }
            groupedByWeek[weekStart].push(log);
        });

        return Object.keys(groupedByWeek).map(weekStart => {
            const weekLogs = groupedByWeek[weekStart];
            const avgTotals = weekLogs.reduce((acc, log) => {
                log.meals.forEach(meal => {
                    acc.calories += meal.nutrients.calories;
                    acc.carbs += meal.nutrients.carbs;
                    acc.protein += meal.nutrients.protein;
                    acc.fat += meal.nutrients.fat;
                });
                return acc;
            }, { calories: 0, carbs: 0, protein: 0, fat: 0, daysWithLog: weekLogs.filter(l => l.meals.length > 0).length || 1 });
            
            return {
                name: new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                date: weekStart,
                calories: Math.round(avgTotals.calories / avgTotals.daysWithLog),
                carbs: Math.round(avgTotals.carbs / avgTotals.daysWithLog),
                protein: Math.round(avgTotals.protein / avgTotals.daysWithLog),
                fat: Math.round(avgTotals.fat / avgTotals.daysWithLog),
            };
        }).slice(-8); // Show last 8 weeks
    }, [logs]);

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" fontSize={12} stroke="currentColor" className="text-text-secondary dark:text-dark-text-secondary" tickLine={false} axisLine={false}/>
                    <YAxis yAxisId="left" orientation="left" stroke="#4F46E5" fontSize={12} tickLine={false} axisLine={false} unit="kcal" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={12} unit="g" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}/>
                    <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                    <Line yAxisId="right" type="monotone" dataKey="protein" name="단백질" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} unit="g" />
                    <Line yAxisId="right" type="monotone" dataKey="fat" name="지방" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} unit="g" />
                    <Line yAxisId="left" type="monotone" dataKey="calories" name="칼로리" stroke="#4F46E5" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} unit="kcal" />
                    <Line yAxisId="right" type="monotone" dataKey="carbs" name="탄수화물" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 6 }} unit="g" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const NutrientRatioChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    const ratioData = useMemo(() => {
        const totals = logs.slice(-30).reduce((acc, log) => {
            log.meals.forEach(meal => {
                acc.carbs += meal.nutrients.carbs;
                acc.protein += meal.nutrients.protein;
                acc.fat += meal.nutrients.fat;
            });
            return acc;
        }, { carbs: 0, protein: 0, fat: 0 });

        const totalGrams = totals.carbs + totals.protein + totals.fat;
        if (totalGrams === 0) return [];
        
        return [
            { name: '탄수화물', value: totals.carbs, color: '#F59E0B' },
            { name: '단백질', value: totals.protein, color: '#10B981' },
            { name: '지방', value: totals.fat, color: '#EF4444' },
        ];
    }, [logs]);

    if (ratioData.length === 0) return null;

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-text-main dark:text-dark-text-main mb-4 text-center">영양소 비율 (30일)</h2>
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
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize: "12px"}}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

interface AIReportProps { onShowReport: () => void; }
const AIReport: React.FC<AIReportProps> = ({ onShowReport }) => (
    <div className="bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl shadow-md p-6 flex flex-col items-center justify-center text-center text-white">
        <SparklesIcon className="w-12 h-12 mb-2" />
        <h2 className="text-xl font-bold mb-2">AI 식단 리포트</h2>
        <p className="mb-4 text-indigo-100">AI가 당신의 식단을 분석하고 맞춤 피드백을 제공합니다.</p>
        <button onClick={onShowReport} className="bg-white text-brand-primary px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors">리포트 보기</button>
    </div>
);


interface BadgeCollectionProps { badges: Badge[]; }
const BadgeCollection: React.FC<BadgeCollectionProps> = ({ badges }) => (
    <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-text-main dark:text-dark-text-main mb-4">뱃지 컬렉션</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {badges.map(badge => (
                <div key={badge.id} className="flex flex-col items-center text-center" title={badge.description}>
                    <div className="text-5xl mb-1">{badge.icon}</div>
                    <p className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">{badge.name}</p>
                </div>
            ))}
        </div>
    </div>
);

// --- MODAL CONTENT COMPONENTS ---

interface AIReportModalContentProps { logs: DailyLog[] }
const AIReportModalContent: React.FC<AIReportModalContentProps> = ({ logs }) => {
    const [report, setReport] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            setIsLoading(true);
            const generatedReport = await generateDietReport(logs);
            setReport(generatedReport);
            setIsLoading(false);
        };
        fetchReport();
    }, [logs]);

    if (isLoading) {
        return <div className="flex flex-col items-center justify-center h-64">
            <SparklesIcon className="w-12 h-12 text-brand-primary animate-pulse" />
            <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">AI가 리포트를 생성하고 있습니다...</p>
        </div>;
    }
    
    // A simple markdown to HTML parser
    const renderMarkdown = (text: string) => {
        return text
            .split('\n')
            .map((line, index) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                    return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-text-main dark:text-dark-text-main">{line.slice(2, -2)}</h3>;
                }
                if (line.startsWith('* ')) {
                    return <li key={index} className="ml-5 list-disc text-text-secondary dark:text-dark-text-secondary">{line.slice(2)}</li>;
                }
                return <p key={index} className="my-1 text-text-secondary dark:text-dark-text-secondary">{line}</p>;
            });
    };

    return (
        <div className="prose dark:prose-invert max-w-none">
            {report ? renderMarkdown(report) : <p>리포트를 불러오지 못했습니다.</p>}
        </div>
    );
};

const DailyNutrientPieChart: React.FC<{ nutrients: { carbs: number; protein: number; fat: number; } }> = ({ nutrients }) => {
    const { carbs, protein, fat } = nutrients;
    const total = carbs + protein + fat;

    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-full w-full bg-light-bg dark:bg-dark-bg rounded-lg text-xs text-text-secondary dark:text-dark-text-secondary">
          영양소 없음
        </div>
      );
    }
    
    const data = [
        { name: '탄수화물', value: carbs, color: '#F59E0B' },
        { name: '단백질', value: protein, color: '#10B981' },
        { name: '지방', value: fat, color: '#EF4444' },
    ];

    const simpleRatio = {
        c: Math.round((carbs / total) * 10),
        p: Math.round((protein / total) * 10),
        f: Math.round((fat / total) * 10),
    }

    return (
        <div className="w-full h-full relative">
            <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={50} fill="#8884d8" paddingAngle={3} dataKey="value" stroke="none">
                         {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-xs text-text-secondary dark:text-dark-text-secondary">탄:단:지 비율</span>
                 <span className="font-bold text-sm text-text-main dark:text-dark-text-main">
                    {`${simpleRatio.c}:${simpleRatio.p}:${simpleRatio.f}`}
                 </span>
            </div>
        </div>
    );
};

interface DayDetailModalContentProps { log: DailyLog | undefined, logsForChart: DailyLog[], userProfile: UserProfile }
const DayDetailModalContent: React.FC<DayDetailModalContentProps> = ({ log, logsForChart, userProfile }) => {
    const [dailySummary, setDailySummary] = useState<string | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    useEffect(() => {
        if (log && log.meals.length > 0) {
            const fetchSummary = async () => {
                setIsSummaryLoading(true);
                const summary = await generateDailySummary(log, { calorieGoal: userProfile.calorieGoal, nutrientGoals: userProfile.nutrientGoals });
                setDailySummary(summary);
                setIsSummaryLoading(false);
            };
            fetchSummary();
        } else {
            setDailySummary(null);
        }
    }, [log, userProfile]);

    if (!log) return <div>선택한 날짜의 기록이 없습니다.</div>;

    const totalNutrients = log.meals.reduce((acc, meal) => {
        acc.calories += meal.nutrients.calories;
        acc.protein += meal.nutrients.protein;
        acc.carbs += meal.nutrients.carbs;
        acc.fat += meal.nutrients.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const chartData = logsForChart.map(l => ({ date: l.date.slice(5), calories: l.meals.reduce((sum, m) => sum + m.nutrients.calories, 0)}));

    return (
        <div className="space-y-6">
            {/* Today's Summary */}
            <div>
                <h3 className="font-bold text-lg mb-3 text-text-main dark:text-dark-text-main">오늘의 요약</h3>
                {isSummaryLoading && 
                    <div className="text-center text-sm p-3 mb-4 bg-light-bg dark:bg-dark-bg rounded-lg animate-pulse">
                        AI가 오늘의 식단을 분석 중입니다...
                    </div>
                }
                {dailySummary && !isSummaryLoading && (
                    <div className="p-3 mb-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-center">
                        <p className="text-sm font-semibold text-brand-primary dark:text-indigo-300">"{dailySummary}"</p>
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-1/3 flex items-center justify-center">
                        <DailyNutrientPieChart nutrients={totalNutrients} />
                    </div>
                    <div className="w-full md:w-2/3 grid grid-cols-1 gap-3">
                        <ProgressBar label="칼로리" current={totalNutrients.calories} goal={userProfile.calorieGoal} unit="kcal" colorClass="bg-brand-primary" />
                        <ProgressBar label="탄수화물" current={totalNutrients.carbs} goal={userProfile.nutrientGoals.carbs} unit="g" colorClass="bg-yellow-500" />
                        <ProgressBar label="단백질" current={totalNutrients.protein} goal={userProfile.nutrientGoals.protein} unit="g" colorClass="bg-green-500" />
                        <ProgressBar label="지방" current={totalNutrients.fat} goal={userProfile.nutrientGoals.fat} unit="g" colorClass="bg-red-500" />
                    </div>
                </div>
            </div>

            {/* Meal Cards */}
            <div>
                 <h3 className="font-bold text-lg mb-2 text-text-main dark:text-dark-text-main">식사 기록</h3>
                 {log.meals.length > 0 ? (
                    <div className="space-y-4">
                        {log.meals.map(meal => (
                            <div key={meal.id} className="flex items-start space-x-4 bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                                <Image src={meal.photoUrl} alt={meal.name} width={96} height={96} className="w-24 h-24 object-cover rounded-md" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-text-main dark:text-dark-text-main">{meal.name}</p>
                                            <p className="text-sm text-brand-secondary font-semibold">{meal.nutrients.calories} kcal</p>
                                        </div>
                                         <div className="text-xs font-bold border border-green-500 text-green-500 rounded-full px-2 py-1">Nutri-Score: {meal.nutrients.nutriScore}</div>
                                    </div>
                                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                                        C: {meal.nutrients.carbs}g, P: {meal.nutrients.protein}g, F: {meal.nutrients.fat}g
                                    </p>
                                    <p className="text-sm mt-2 p-2 bg-white dark:bg-gray-700 rounded-md italic">"{meal.aiComment}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <p className="text-center text-text-secondary dark:text-dark-text-secondary py-4">이 날은 기록된 식사가 없습니다.</p>
                 )}
            </div>

            {/* Mini Chart */}
            <div className="h-48">
                <h3 className="font-bold text-lg mb-2 text-text-main dark:text-dark-text-main">최근 7일 칼로리 변화</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <XAxis dataKey="date" fontSize={12} stroke="currentColor" className="text-text-secondary dark:text-dark-text-secondary" />
                        <YAxis fontSize={12} stroke="currentColor" className="text-text-secondary dark:text-dark-text-secondary" />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }} labelStyle={{ color: '#F9FAFB' }} itemStyle={{color: '#10B981'}} />
                        <Line type="monotone" dataKey="calories" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            
            {/* Mission & Memo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                    <h4 className="font-semibold mb-1 text-text-main dark:text-dark-text-main">오늘의 행동 미션</h4>
                    <p className="text-text-secondary dark:text-dark-text-secondary">💧 {log.mission}</p>
                </div>
                 <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                    <h4 className="font-semibold mb-1 text-text-main dark:text-dark-text-main">오늘의 한마디 {log.emotion}</h4>
                    <p className="text-text-secondary dark:text-dark-text-secondary">"{log.memo}"</p>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function ProfileDashboard({ userProfile, badges, dailyLogs }: ProfileDashboardProps) {
    const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
    const [isAIReportModalOpen, setIsAIReportModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');

    const handleDateClick = (date: string) => {
        setSelectedDate(date);
        setIsDayDetailModalOpen(true);
    };
    
    const selectedLog = useMemo(() => dailyLogs.find(log => log.date === selectedDate), [dailyLogs, selectedDate]);
    
    const logsForChart = useMemo(() => {
        if (!selectedDate) return [];
        const endIndex = dailyLogs.findIndex(log => log.date === selectedDate);
        if (endIndex === -1) return [];
        const startIndex = Math.max(0, endIndex - 6);
        return dailyLogs.slice(startIndex, endIndex + 1);
    }, [dailyLogs, selectedDate]);


    return (
        <>
            <ProfileHeader user={userProfile} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <MyStats logs={dailyLogs} />
                    <MealCalendar logs={dailyLogs} onDateClick={handleDateClick} />
                </div>
                <div className="space-y-8">
                    <div className="bg-white dark:bg-dark-card-bg rounded-xl shadow-md p-6 space-y-4">
                       <div className="flex justify-between items-center">
                         <h2 className="text-xl font-bold text-text-main dark:text-dark-text-main">섭취량 변화</h2>
                         <div className="flex p-1 bg-light-bg dark:bg-dark-bg rounded-lg">
                           <button onClick={() => setChartView('daily')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${chartView === 'daily' ? 'bg-brand-primary text-white shadow' : 'text-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'}`}>일별</button>
                           <button onClick={() => setChartView('weekly')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${chartView === 'weekly' ? 'bg-brand-primary text-white shadow' : 'text-text-secondary dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'}`}>주별</button>
                         </div>
                       </div>
                       {chartView === 'daily' ? (
                         <CalorieNutrientChart logs={dailyLogs} calorieGoal={userProfile.calorieGoal} onDateClick={handleDateClick} />
                       ) : (
                         <WeeklyAverageChart logs={dailyLogs} />
                       )}
                    </div>
                    <NutrientRatioChart logs={dailyLogs} />
                    <AIReport onShowReport={() => setIsAIReportModalOpen(true)} />
                    <BadgeCollection badges={badges} />
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isDayDetailModalOpen} onClose={() => setIsDayDetailModalOpen(false)} title={`기록: ${selectedDate ? new Date(selectedDate).toLocaleDateString() : ''}`}>
                <DayDetailModalContent log={selectedLog} logsForChart={logsForChart} userProfile={userProfile} />
            </Modal>
            
            <Modal isOpen={isAIReportModalOpen} onClose={() => setIsAIReportModalOpen(false)} title="AI 식단 리포트">
                <AIReportModalContent logs={dailyLogs} />
            </Modal>
        </>
    );
}
