'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Cookie } from 'lucide-react';

const CONSENT_COOKIE_KEY = 'cookie_consent';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // This code runs only on the client
    const consent = localStorage.getItem(CONSENT_COOKIE_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_COOKIE_KEY, 'true');
    setShowBanner(false);
  };
  
  const handleDecline = () => {
    // You might want to disable localStorage-based features here
    // For now, we'll just remember the choice and hide the banner
    localStorage.setItem(CONSENT_COOKIE_KEY, 'false');
    setShowBanner(false);
  };


  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <Card className="max-w-xl mx-auto shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cookie /> Your Privacy</CardTitle>
          <CardDescription>
            We use your browser's local storage to save your work and preferences. This data stays on your device and is never sent to us. By continuing to use the app, you agree to this. See our <Link href="/cookie" className="underline">Cookie Policy</Link> for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleAccept} className="w-full">Accept</Button>
                <Button onClick={handleDecline} variant="outline" className="w-full">Decline</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
