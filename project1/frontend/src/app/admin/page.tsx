'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // 클라이언트에서 role 확인 (로컬스토리지에 저장된 토큰/role 사용)
    const userStr = localStorage.getItem('user');
    let role = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        role = user.role;
      } catch {}
    }
    if (role !== 'admin') {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <h1 className="text-3xl font-nanum mb-4">관리자 대시보드</h1>
      <p className="text-lg text-muted-foreground">이 페이지는 관리자만 접근할 수 있습니다.</p>
    </div>
  );
} 