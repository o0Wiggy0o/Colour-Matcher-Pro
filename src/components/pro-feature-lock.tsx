import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProFeatureLockProps {
  featureName: string;
}

export function ProFeatureLock({ featureName }: ProFeatureLockProps) {
  return (
    <Card className="text-center bg-muted/50 border-dashed">
      <CardHeader className="items-center p-6">
        <Lock className="h-6 w-6 text-yellow-500 mb-2" />
        <CardTitle className="text-lg">Unlock {featureName}</CardTitle>
        <CardDescription className="text-xs px-4">
          This is a Pro feature. Toggle "Pro Mode" in the header to preview.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
