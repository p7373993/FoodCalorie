'use client';

import React, { useState } from 'react';
import { Camera, Upload, Loader2, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/lib/api';

interface MealFormData {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  mass: number;  // 질량 정보 추가
  carbs: number;
  protein: number;
  fat: number;
  nutriScore: 'A' | 'B' | 'C' | 'D' | 'E';
}

export function MealUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [analysisMethod, setAnalysisMethod] = useState<'gemini' | 'mlserver'>('gemini');
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<MealFormData>({
    defaultValues: {
      mealType: 'lunch',
      foodName: '',
      calories: 0,
      mass: 0,  // 질량 기본값 추가
      carbs: 0,
      protein: 0,
      fat: 0,
      nutriScore: 'C'
    }
  });

  const watchedValues = watch();
  const [aiComment, setAiComment] = useState<string | null>(null);

  // MLServer 작업 모니터링 함수
  const monitorMLServerTask = async (taskId: string) => {
    return new Promise((resolve, reject) => {
      console.log('WebSocket 연결 시도:', `ws://localhost:8000/ws/task/${taskId}/`);
      const ws = new WebSocket(`ws://localhost:8000/ws/task/${taskId}/`);
      
      let connectionTimeout = setTimeout(() => {
        console.log('WebSocket 연결 타임아웃');
        ws.close();
        setAiComment('MLServer 연결 시간이 초과되었습니다. 다시 시도해주세요.');
        reject(new Error('연결 타임아웃'));
      }, 5000); // 5초 연결 타임아웃
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket 연결됨:', taskId);
        setAiComment('MLServer에서 이미지를 분석하는 중입니다... (연결됨)');
        
        // 연결 후 상태 요청
        ws.send(JSON.stringify({ type: 'get_status' }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket 메시지:', data);
          
          // Django 백엔드 메시지 형식에 맞게 처리
          if (data.type === 'task.update' && data.data) {
            const taskData = data.data;
            const progress = Math.round((taskData.progress || 0) * 100);
            setAiComment(`MLServer 분석 중... ${progress}% 완료 - ${taskData.message || ''}`);
            
          } else if (data.type === 'task.completed' && data.data) {
            const taskData = data.data;
            const result = taskData.result;
            
            console.log('작업 완료 결과:', result);
            
            // MLServer 결과 형식에 맞게 처리
            if (result) {
              // MLServer 결과에서 mass_estimation 확인
              if (result.mass_estimation) {
                const massEst = result.mass_estimation;
                
                // 첫 번째 음식 정보 사용
                if (massEst.foods && massEst.foods.length > 0) {
                  const firstFood = massEst.foods[0];
                  if (firstFood.food_name) setValue('foodName', firstFood.food_name);
                  if (firstFood.estimated_mass_g && firstFood.estimated_mass_g > 0) {
                    setValue('mass', Math.round(firstFood.estimated_mass_g));
                  }
                }
                
                // 총 질량 사용
                if (massEst.total_mass_g && massEst.total_mass_g > 0) {
                  setValue('mass', Math.round(massEst.total_mass_g));
                  
                  // 질량을 기반으로 칼로리 추정 (기본값: 2kcal/g)
                  const estimatedCalories = Math.round(massEst.total_mass_g * 2);
                  setValue('calories', estimatedCalories);
                  
                  // 기본 영양소 비율로 추정 (임시값)
                  setValue('carbs', Math.round(estimatedCalories * 0.5 / 4)); // 탄수화물 50%
                  setValue('protein', Math.round(estimatedCalories * 0.2 / 4)); // 단백질 20%
                  setValue('fat', Math.round(estimatedCalories * 0.3 / 9)); // 지방 30%
                  setValue('nutriScore', 'C'); // 기본 등급
                }
                
                // 성공 메시지
                if (massEst.foods && massEst.foods.length > 0) {
                  const firstFood = massEst.foods[0];
                  const foodName = firstFood.food_name || '음식';
                  const totalMass = Math.round(massEst.total_mass_g || 0);
                  const estimatedCalories = Math.round(totalMass * 2);
                  if (totalMass > 0) {
                    setAiComment(`MLServer로 분석 완료: ${foodName} (질량: ${totalMass}g, 추정 칼로리: ${estimatedCalories}kcal)`);
                  } else {
                    setAiComment(`MLServer로 분석 완료: ${foodName}`);
                  }
                } else {
                  setAiComment('MLServer 분석이 완료되었습니다.');
                }
              } else {
                // 기본 결과 형식 처리 (백업)
                if (result.foodName) setValue('foodName', result.foodName);
                if (result.calories && result.calories > 0) setValue('calories', result.calories);
                if (result.mass && result.mass > 0) setValue('mass', result.mass);
                if (result.carbs !== undefined) setValue('carbs', result.carbs);
                if (result.protein !== undefined) setValue('protein', result.protein);
                if (result.fat !== undefined) setValue('fat', result.fat);
                if (result.grade) setValue('nutriScore', result.grade);
                
                const foodName = result.foodName || '음식';
                const mass = result.mass || 0;
                if (mass > 0) {
                  setAiComment(`MLServer로 분석 완료: ${foodName} (질량: ${mass}g)`);
                } else {
                  setAiComment(`MLServer로 분석 완료: ${foodName}`);
                }
              }
            } else {
              setAiComment('MLServer 분석이 완료되었습니다.');
            }
            
            ws.close();
            resolve(result);
            
          } else if (data.type === 'task.failed' && data.data) {
            const taskData = data.data;
            setAiComment('MLServer 분석에 실패했습니다: ' + (taskData.error || '알 수 없는 오류'));
            ws.close();
            reject(new Error(taskData.error || 'MLServer 분석 실패'));
          }
        } catch (error) {
          console.error('WebSocket 메시지 파싱 오류:', error);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket 오류:', error);
        setAiComment('MLServer 연결에 문제가 발생했습니다. 서버 상태를 확인해주세요.');
        reject(error);
      };
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket 연결 종료:', event.code, event.reason);
        if (event.code !== 1000) { // 정상 종료가 아닌 경우
          console.log('비정상 WebSocket 종료');
        }
      };
      
      // 30초 작업 타임아웃
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          setAiComment('MLServer 분석 시간이 초과되었습니다. 다시 시도해주세요.');
          reject(new Error('작업 타임아웃'));
        }
      }, 30000);
    });
  };

  // 파일 선택 핸들러
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      alert("이미지 파일을 선택하세요.");
      return;
    }
    setSelectedFile(file);
      
      // 미리보기 URL 생성
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // AI 분석 시작
      analyzeImage(file);
  };

  // AI 이미지 분석
  const analyzeImage = async (file: File) => {
    setAnalyzing(true);
    setAiComment(null); // 분석 시작 시 기존 메시지 초기화
    try {
      let result;
      
      if (analysisMethod === 'gemini') {
        // Gemini API 방식 (순수 LLM만 사용)
        result = await apiClient.analyzeImageGemini(file);
        
        // 분석 결과로 폼 필드 자동 채우기
        if (result.foodName) setValue('foodName', result.foodName);
        if (result.calories) setValue('calories', result.calories);
        if (result.mass && result.mass > 0) setValue('mass', result.mass);
        if (result.carbs !== undefined) setValue('carbs', result.carbs);
        if (result.protein !== undefined) setValue('protein', result.protein);
        if (result.fat !== undefined) setValue('fat', result.fat);
        if (result.grade) setValue('nutriScore', result.grade);
        else if (result.nutriScore) setValue('nutriScore', result.nutriScore);
        if (result.aiComment) setAiComment(result.aiComment);
        
      } else {
        // MLServer 방식 - 비동기 처리
        console.log('MLServer 분석 시작...');
        setAiComment('MLServer로 이미지를 업로드하는 중입니다...');
        
        const uploadResult = await apiClient.analyzeImageMLServer(file);
        console.log('MLServer 업로드 응답:', uploadResult);
        
        if (uploadResult && uploadResult.data && uploadResult.data.task_id) {
          const taskId = uploadResult.data.task_id;
          setAiComment('MLServer에서 이미지를 분석하는 중입니다... (실시간 진행상황 확인 중)');
          
          // WebSocket으로 실시간 진행상황 모니터링
          await monitorMLServerTask(taskId);
        } else {
          console.log('MLServer task_id를 받지 못했습니다:', uploadResult);
          setAiComment('MLServer 업로드에 실패했습니다. 다시 시도해주세요.');
        }
      }
      
    } catch (error) {
      console.error('Image analysis failed:', error);
      setAiComment(`${analysisMethod === 'gemini' ? 'Gemini' : 'MLServer'} 음식 인식에 실패했습니다. 직접 입력해 주세요.`);
    }
    setAnalyzing(false);
  };

  // 폼 제출 핸들러
  const onSubmit = async (data: MealFormData) => {
    setSubmitting(true);
    try {
      const mealData = {
        ...data,
        date: new Date().toISOString().split('T')[0]
      };
      
      await apiClient.createMealLog(mealData);
      setSuccess(true);
      
      // 폼 초기화
      setTimeout(() => {
        reset();
        setSelectedFile(null);
        setPreviewUrl(null);
        setSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Meal log creation failed:', error);
    }
    setSubmitting(false);
  };

  // 파일 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      analyzeImage(file);
    }
  };

  const getNutriScoreColor = (score: string) => {
    switch (score) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-yellow-500';
      case 'C': return 'bg-orange-500';
      case 'D': return 'bg-red-500';
      case 'E': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };



  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 이미지 업로드 영역 */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-nanum mb-4">사진 업로드</h2>
            
            {/* 분석 방식 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">분석 방식</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="gemini"
                    checked={analysisMethod === 'gemini'}
                    onChange={(e) => {
                      setAnalysisMethod(e.target.value as 'gemini' | 'mlserver');
                      // 이미 업로드된 파일이 있으면 다시 분석
                      if (selectedFile) {
                        analyzeImage(selectedFile);
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">Gemini AI (빠름)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="mlserver"
                    checked={analysisMethod === 'mlserver'}
                    onChange={(e) => {
                      setAnalysisMethod(e.target.value as 'gemini' | 'mlserver');
                      // 이미 업로드된 파일이 있으면 다시 분석
                      if (selectedFile) {
                        analyzeImage(selectedFile);
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">MLServer (정밀)</span>
                </label>
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  분석 방식을 변경하면 자동으로 다시 분석됩니다.
                </p>
              )}
            </div>
            
            {!previewUrl ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">사진을 업로드하세요</p>
                <p className="text-sm text-muted-foreground mb-4">
                  클릭하거나 드래그하여 사진을 선택하세요
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">파일 선택</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="업로드된 식사 사진"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    reset();
                  }}
                  className="absolute top-2 right-2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <input
              id="file-input"
              type="file"
              accept="image/*"
              name="image"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {analyzing && (
            <div className="card p-6">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">AI가 사진을 분석하고 있습니다...</span>
              </div>
            </div>
          )}
        </div>

        {/* 식사 정보 입력 폼 */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-nanum mb-4">식사 정보</h2>
            {aiComment && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded">
                {aiComment}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 식사 종류 */}
              <div>
                <label className="block text-sm font-medium mb-2">식사 종류</label>
                <select
                  {...register('mealType', { required: '식사 종류를 선택해주세요' })}
                  className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="breakfast">아침</option>
                  <option value="lunch">점심</option>
                  <option value="dinner">저녁</option>
                  <option value="snack">간식</option>
                </select>
              </div>

              {/* 음식 이름 */}
              <div>
                <label className="block text-sm font-medium mb-2">음식 이름</label>
                <input
                  {...register('foodName', { required: '음식 이름을 입력해주세요' })}
                  type="text"
                  className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="예: 닭가슴살 샐러드"
                />
                {errors.foodName && (
                  <p className="text-sm text-destructive mt-1">{errors.foodName.message}</p>
                )}
              </div>

              {/* 칼로리와 질량 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">칼로리 (kcal)</label>
                  <input
                    {...register('calories', { required: '칼로리를 입력해주세요', min: 0 })}
                    type="number"
                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="350"
                  />
                  {errors.calories && (
                    <p className="text-sm text-destructive mt-1">{errors.calories.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">질량 (g)</label>
                  <input
                    {...register('mass', { min: 0 })}
                    type="number"
                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="200"
                  />
                </div>
              </div>

              {/* 영양소 정보 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">탄수화물 (g)</label>
                  <input
                    {...register('carbs', { required: true, min: 0 })}
                    type="number"
                    step="any"
                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">단백질 (g)</label>
                  <input
                    {...register('protein', { required: true, min: 0 })}
                    type="number"
                    step="any"
                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">지방 (g)</label>
                  <input
                    {...register('fat', { required: true, min: 0 })}
                    type="number"
                    step="any"
                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="15"
                  />
                </div>
              </div>

              {/* 영양 등급 */}
              <div>
                <label className="block text-sm font-medium mb-2">영양 등급</label>
                <select
                  {...register('nutriScore', { required: true })}
                  className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="A">A (매우 좋음)</option>
                  <option value="B">B (좋음)</option>
                  <option value="C">C (보통)</option>
                  <option value="D">D (나쁨)</option>
                  <option value="E">E (매우 나쁨)</option>
                </select>
              </div>

              {/* 영양 등급 미리보기 */}
              {watchedValues.nutriScore && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm">영양 등급:</span>
                  <div className={`px-2 py-1 rounded text-white text-xs font-medium ${getNutriScoreColor(watchedValues.nutriScore)}`}>
                    {watchedValues.nutriScore}
                  </div>
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={submitting || !selectedFile}
                className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : success ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>저장 완료!</span>
                  </>
                ) : (
                  <span>식사 로그 저장</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 