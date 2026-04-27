"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from 'next/dynamic';
import { LayoutGrid, Briefcase, Image as ImageIcon, Loader2, LogOut, Mail, Star, User as UserIcon, DatabaseBackup } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { GridData } from "@/lib/grid";
import { generateGridData } from "@/lib/grid";
import { defaultFormValues } from "@/components/grid-generator";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth as useFirebaseAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BackupRestoreDialog } from "@/components/backup-restore-dialog";
import type { ColorHistoryEntry } from "@/components/color-history";
import useLocalStorage from "@/hooks/use-local-storage";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full w-full bg-background">
    <Loader2 className="h-16 w-16 animate-spin text-primary" />
  </div>
);

const GridGenerator = dynamic(() => import('@/components/grid-generator').then(mod => mod.GridGenerator), {
  loading: () => <LoadingSpinner />,
  ssr: false, 
});
const JobColorTracker = dynamic(() => import('@/components/job-color-tracker'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
const ImageColorExtractor = dynamic(() => import('@/components/image-color-extractor').then(mod => mod.ImageColorExtractor), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
const ColorMemoryGame = dynamic(() => import('@/components/color-memory-game').then(mod => mod.ColorMemoryGame), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});
const GoProPage = dynamic(() => import('@/components/go-pro-page'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});


export default function Home() {
  const [activeTab, setActiveTab] = useState("grid-generator");
  const [isGameMode, setIsGameMode] = useState(false);
  const { user, loading: authLoading, isPro } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const auth = useFirebaseAuth();

  const [gridData, setGridData] = useState<GridData | null>(null);
  
  // This state will now live here so the Backup dialog can access it
  const [colorHistory, setColorHistory] = useLocalStorage<ColorHistoryEntry[]>('color-matcher-pro-history', []);


  // Randomize grid on initial client load
  useEffect(() => {
    const randomC = Math.floor(Math.random() * 101);
    const randomM = Math.floor(Math.random() * 101);
    const randomY = Math.floor(Math.random() * 101);
    const randomK = Math.floor(Math.random() * 51); // Bias towards lighter colors
    
    const randomGrid = generateGridData(
      { c: randomC, m: randomM, y: randomY, k: randomK },
      defaultFormValues.gridSize,
      defaultFormValues.step,
      defaultFormValues.xAxis,
      defaultFormValues.yAxis
    );
    setGridData(randomGrid);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleTabChange = (value: string) => {
    if (value === 'colour-tracker' && !isPro) {
      setActiveTab('go-pro');
      toast({
        title: 'Pro Feature',
        description: 'The Colour Tracker is a Pro feature. See what you get by upgrading!',
      });
      return;
    }
    setActiveTab(value);
  };

  const handleSignOut = async () => {
    try {
      if (!auth) return;
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/login');
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Failed", description: "An error occurred while signing out." });
    }
  };

  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  const tabsContent = (
    <>
      <TabsTrigger value="grid-generator">
        <LayoutGrid className="mr-2" />
        <span className="hidden sm:inline">Grid Generator</span>
      </TabsTrigger>
      <TabsTrigger value="colour-tracker">
        <Briefcase className="mr-2" />
        <span className="hidden sm:inline">Colour Tracker</span>
        {!isPro && <Star className="ml-2 h-3 w-3 text-yellow-400 fill-yellow-400" />}
      </TabsTrigger>
      <TabsTrigger value="image-color-extractor">
        <ImageIcon className="mr-2" />
        <span className="hidden sm:inline">Image Color Extractor</span>
      </TabsTrigger>
      {!isPro && (
        <TabsTrigger value="go-pro" className="text-primary hover:text-primary/90 data-[state=active]:bg-primary/10">
          <Star className="mr-2" />
          <span className="hidden sm:inline">Go Pro</span>
        </TabsTrigger>
      )}
    </>
  );

  return (
    <div className="h-full w-full flex flex-col bg-background font-sans">
      <header className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between px-4 sm:px-6 py-5">
            <Logo />

            <div className="hidden md:flex justify-center">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                  <TabsList>{tabsContent}</TabsList>
                </Tabs>
            </div>

            <div className="flex items-center space-x-3">
              {isPro && (
                  <Badge variant="outline" className="border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:border-amber-400/50 dark:bg-amber-400/10 font-semibold pointer-events-none">
                    <Star className="mr-1.5 h-3 w-3 fill-current" />
                    Pro
                  </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsFeedbackDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Feedback</span>
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || "My Account"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isPro && (
                     <DropdownMenuItem disabled>
                        <Star className="mr-2 h-4 w-4" />
                        <span>Pro Account</span>
                      </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setIsBackupDialogOpen(true)}>
                    <DatabaseBackup className="mr-2 h-4 w-4" />
                    <span>Backup & Restore</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
          <div className="md:hidden border-t bg-muted/30">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="p-2">
                  <TabsList className={cn("grid w-full h-12", !isPro ? "grid-cols-4" : "grid-cols-3")}>
                    {tabsContent}
                  </TabsList>
              </Tabs>
          </div>
      </header>
      
      <main className="flex-grow overflow-hidden flex flex-col min-h-0">
        {isGameMode ? (
          <ColorMemoryGame onClose={() => setIsGameMode(false)} />
        ) : (
          <>
            {activeTab === 'grid-generator' && <GridGenerator isPro={isPro} gridData={gridData} setGridData={setGridData} colorHistory={colorHistory} setColorHistory={setColorHistory} />}
            {activeTab === 'colour-tracker' && isPro && (
              <JobColorTracker />
            )}
            {activeTab === 'image-color-extractor' && <ImageColorExtractor isPro={isPro} />}
            {activeTab === 'go-pro' && <GoProPage />}
          </>
        )}
      </main>

      <footer className="flex-shrink-0 border-t bg-background">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground p-4 gap-y-2">
            <p className="text-center sm:text-left">&copy; {new Date().getFullYear()} Colour Matcher Pro. All rights reserved.</p>
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center">
                <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
                <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="/cookie" className="hover:text-foreground transition-colors">Cookie Policy</a>
            </div>
        </div>
      </footer>
      <CookieConsentBanner />
      <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} user={user} />
      <BackupRestoreDialog 
        open={isBackupDialogOpen} 
        onOpenChange={setIsBackupDialogOpen}
        colorHistory={colorHistory}
        setColorHistory={setColorHistory}
      />
    </div>
  );
}
