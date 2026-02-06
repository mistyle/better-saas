'use client';

import { themePage } from '@/themes/client-loader';
import { useProfile } from '@/hooks/use-profile';
import { Loader2 } from 'lucide-react';

const ProfileContent = themePage('profile', 'ProfileContent');

export default function ProfilePage() {
  const profileData = useProfile();

  if (profileData.isLoading && !profileData.user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <ProfileContent {...profileData} />;
}
