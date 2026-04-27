
'use client';

import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { useUser } from '@/firebase';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPro: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In a real application, you would check a user's subscription status
// against a backend service (e.g., checking a 'pro' flag in a Firestore user document).
// For this demo, we'll simulate it with a hardcoded list of emails.
const PRO_USERS = [
    'pro-user-1@example.com',
    'pro-user-2@example.com',
    'production@stripemaster.co.uk',
    'alphatest@cmp.com',
    'colourmatcherprodev@gmail.com',
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading, userError } = useUser();

  if (userError) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
              <div className="w-full max-w-lg">
                  <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Authentication Service Error</AlertTitle>
                      <AlertDescription>
                          There was an error with the authentication service. Please check your network connection and try again.
                          <br/><br/>
                          <code className="text-xs">{userError.message}</code>
                      </AlertDescription>
                  </Alert>
              </div>
          </div>
      );
  }

  const isPro = user ? PRO_USERS.includes(user.email || '') : false;

  return (
    <AuthContext.Provider value={{ user, loading: isUserLoading, isPro }}>
      {children}
    </AuthContext.Provider>
  );
};
