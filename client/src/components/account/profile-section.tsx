import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProfileSectionProps {
  userId: number;
}

export default function ProfileSection({ userId }: ProfileSectionProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}`],
  });
  
  const { toast } = useToast();
  
  const handleEditProfile = () => {
    toast({
      title: "Coming Soon",
      description: "Profile editing will be available in a future update.",
      variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200 mb-6 animate-pulse">
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 bg-neutral-200 rounded-full mr-4"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-neutral-200 rounded w-1/2"></div>
            <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
          </div>
        </div>
        <div className="h-10 bg-neutral-200 rounded w-full"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200 mb-6">
      <div className="flex items-center mb-4">
        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mr-4">
          <i className="fas fa-user text-2xl text-neutral-600"></i>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{user.fullName}</h2>
          <p className="text-neutral-500">{user.email}</p>
          <div className="flex items-center mt-1">
            <span className={`text-xs text-white ${user.isVerified ? 'bg-success' : 'bg-warning'} px-2 py-0.5 rounded-full`}>
              {user.isVerified ? 'Verified' : 'Verification Pending'}
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={handleEditProfile}
      >
        Edit Profile
      </Button>
    </div>
  );
}
