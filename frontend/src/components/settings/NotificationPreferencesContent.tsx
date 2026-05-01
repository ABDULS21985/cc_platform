'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

export function NotificationPreferencesContent() {
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(false);

  return (
    <div className="w-full">
      {/* Header */}
      {/* <h2 className="text-xl font-bold text-[#000000] mb-6">Notifications</h2> */}

      {/* Notification Settings */}
      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-medium text-[#000000] mb-1">Email</h3>
            <p className="text-sm text-[#525252]">
              Allow ccpay to send notification on email
            </p>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
            className="data-[state=checked]:bg-[#0E9DA5]"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-medium text-[#000000] mb-1">SMS</h3>
            <p className="text-sm text-[#525252]">
              Allow ccpay to send sms via phone number
            </p>
          </div>
          <Switch
            checked={smsNotifications}
            onCheckedChange={setSmsNotifications}
            className="data-[state=checked]:bg-[#0E9DA5]"
          />
        </div>

        {/* In-app Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-base font-medium text-[#000000] mb-1">
              In-app
            </h3>
            <p className="text-sm text-[#525252]">
              Allow ccpay to send inapp notification
            </p>
          </div>
          <Switch
            checked={inAppNotifications}
            onCheckedChange={setInAppNotifications}
            className="data-[state=checked]:bg-[#0E9DA5]"
          />
        </div>
      </div>
    </div>
  );
}
