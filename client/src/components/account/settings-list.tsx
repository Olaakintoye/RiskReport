import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SettingsListProps {
  userId: number;
}

export default function SettingsList({ userId }: SettingsListProps) {
  const { data: preferences, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}/preferences`],
  });
  
  const { toast } = useToast();
  
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest('PATCH', `/api/users/${userId}/preferences`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/preferences`] });
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    }
  });
  
  const handleToggle = (field: string, value: boolean) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };
  
  const handleFakeLink = () => {
    toast({
      title: "Coming Soon",
      description: "This feature will be available in a future update.",
      variant: "default",
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Account Management */}
        <div>
          <div className="h-6 bg-neutral-200 rounded w-40 mb-3"></div>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 border-b border-neutral-200 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-neutral-200 rounded-lg mr-3"></div>
                    <div className="h-4 bg-neutral-200 rounded w-32"></div>
                  </div>
                  <div className="h-4 bg-neutral-200 rounded w-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Preferences */}
        <div>
          <div className="h-6 bg-neutral-200 rounded w-40 mb-3"></div>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border-b border-neutral-200 last:border-b-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-neutral-200 rounded-lg mr-3"></div>
                    <div className="h-4 bg-neutral-200 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-neutral-200 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!preferences) {
    return null;
  }
  
  return (
    <>
      {/* Account Management */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Account Management</h2>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200">
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-university text-primary"></i>
                </div>
                <span className="font-medium">Linked Bank Accounts</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
          <div className="border-b border-neutral-200">
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-exchange-alt text-secondary"></i>
                </div>
                <span className="font-medium">Transaction History</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
          <div className="border-b border-neutral-200">
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-bell text-accent"></i>
                </div>
                <span className="font-medium">Notifications Settings</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
          <div>
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-shield-alt text-success"></i>
                </div>
                <span className="font-medium">Security</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* Preferences */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Preferences</h2>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200">
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-moon text-primary"></i>
                </div>
                <span className="font-medium">Dark Mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={preferences.darkMode}
                  onChange={(e) => handleToggle('darkMode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <div className="border-b border-neutral-200">
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-bell text-secondary"></i>
                </div>
                <span className="font-medium">Push Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={preferences.pushNotifications}
                  onChange={(e) => handleToggle('pushNotifications', e.target.checked)}
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-envelope text-accent"></i>
                </div>
                <span className="font-medium">Email Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={preferences.emailNotifications}
                  onChange={(e) => handleToggle('emailNotifications', e.target.checked)}
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Support Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Help & Support</h2>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200">
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-question-circle text-primary"></i>
                </div>
                <span className="font-medium">Help Center</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
          <div className="border-b border-neutral-200">
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-headset text-secondary"></i>
                </div>
                <span className="font-medium">Contact Support</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
          <div>
            <button 
              onClick={handleFakeLink}
              className="flex justify-between items-center p-4 w-full text-left"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-book text-accent"></i>
                </div>
                <span className="font-medium">Terms & Privacy</span>
              </div>
              <i className="fas fa-chevron-right text-neutral-400"></i>
            </button>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleFakeLink}
        className="w-full py-3 text-error font-medium border border-error rounded-lg mb-6"
      >
        <i className="fas fa-sign-out-alt mr-2"></i> Log Out
      </button>
    </>
  );
}
