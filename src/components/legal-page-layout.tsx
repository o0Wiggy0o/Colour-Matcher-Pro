import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function LegalPageLayout({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 text-foreground p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-md">
        
        {/* CardHeader equivalent */}
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <h3 className="text-2xl md:text-3xl font-semibold leading-none tracking-tight">{title}</h3>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
          </div>
        </div>

        {/* CardContent equivalent */}
        <div className="p-6 pt-0">
            {/* Alert equivalent */}
            <div role="alert" className="relative w-full rounded-lg border p-4 mb-6 border-destructive/50 text-destructive dark:border-destructive">
              <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                  <div>
                      <h5 className="font-medium leading-none tracking-tight">Disclaimer</h5>
                      <div className="mt-2 text-sm">
                          <p>This is a placeholder document. The content provided here is for template purposes only and does not constitute legal advice. You should consult with a qualified legal professional to create policies tailored to your specific needs.</p>
                      </div>
                  </div>
              </div>
            </div>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
                {children}
            </div>
        </div>

      </div>
    </div>
  );
}
