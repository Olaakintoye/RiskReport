import { useQuery } from "@tanstack/react-query";
import ProfileSection from "@/components/account/profile-section";
import SettingsList from "@/components/account/settings-list";

export default function Account() {
  // Get current user
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['/api/current-user'],
  });
  
  const userId = currentUser?.id || 1; // Default to ID 1 for demo
  
  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-20 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-7 bg-neutral-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-48"></div>
          </div>
          <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
        </div>
        
        <div className="h-32 bg-neutral-200 rounded-xl mb-6"></div>
        
        <div className="space-y-6">
          <div>
            <div className="h-6 bg-neutral-200 rounded w-40 mb-3"></div>
            <div className="h-48 bg-neutral-200 rounded-xl"></div>
          </div>
          <div>
            <div className="h-6 bg-neutral-200 rounded w-40 mb-3"></div>
            <div className="h-36 bg-neutral-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="px-4 pt-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-neutral-500 text-sm">Manage your profile</p>
        </div>
        <button className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
          <i className="fas fa-gear text-neutral-600"></i>
        </button>
      </div>
      
      <ProfileSection userId={userId} />
      
      <SettingsList userId={userId} />
    </div>
  );
}
