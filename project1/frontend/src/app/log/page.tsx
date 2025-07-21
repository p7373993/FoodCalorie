import { MealUploader } from '@/components/meals/MealUploader';

export default function LogPage() {
  return (
    <div className="space-y-8">
      {/* 페이지 헤더 */}
      <div className="rounded-2xl border bg-white text-card-foreground shadow-lg p-8 flex items-center space-x-4">
        <span className="text-4xl">🍽️</span>
        <div>
          <h1 className="text-3xl font-noto font-extrabold text-foreground mb-1">식사 로그</h1>
          <p className="text-base text-muted-foreground font-noto">
            사진을 업로드하여 AI 분석으로 간편하게 식사를 기록하세요
          </p>
        </div>
      </div>

      {/* 식사 업로더 */}
      <div className="rounded-2xl border bg-white text-card-foreground shadow-lg p-8">
        <MealUploader />
      </div>
    </div>
  );
} 