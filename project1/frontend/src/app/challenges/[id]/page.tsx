import { SurvivalBoard } from '@/components/challenges/SurvivalBoard';

interface ChallengeDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChallengeDetailPage({ params }: ChallengeDetailPageProps) {
  const { id } = await params;
  
  return (
    <div className="space-y-8">
      {/* 생존 보드 */}
      <SurvivalBoard challengeId={id} />
    </div>
  );
} 