
import ProfileDashboard from "@/app/components/profile-dashboard";
import { createMockData } from "@/app/lib/data";
import AuthNavigation from "@/app/components/AuthNavigation";

export default function Home() {
  // Data is fetched on the server
  const { userProfile, badges, dailyLogs } = createMockData();

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
       <ProfileDashboard
          userProfile={userProfile}
          badges={badges}
          dailyLogs={dailyLogs}
        />
    </main>
  );
}
