import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal-page-layout';

export const metadata: Metadata = {
  title: 'Cookie Policy - Colour Matcher Pro',
  description: "Learn how Colour Matcher Pro uses your browser's local storage to save your work and preferences, and how you can control it.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy">
      <p><strong>Last Updated:</strong> October 26, 2023</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">What Are Cookies?</h2>
      <p>As is common practice with almost all professional websites, this site uses cookies and similar technologies like localStorage, which are tiny files that are downloaded to your computer to improve your experience.</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">How We Use Local Storage</h2>
      <p>We use your browser's localStorage to provide core functionality. Specifically:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Application Data:</strong> All your jobs, color histories, and saved preferences are stored in localStorage so your work is saved between sessions on your device.</li>
        <li><strong>Theme Preference:</strong> We store your choice of light or dark theme so the site remembers your preference on your next visit.</li>
        <li><strong>Cookie Consent:</strong> We store your consent preference for using these technologies.</li>
      </ul>
      <p className="pt-2">We do not use any third-party tracking or advertising cookies.</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">Disabling Local Storage</h2>
      <p>You can prevent the storing of data by adjusting the settings on your browser (see your browser Help for how to do this). Be aware that disabling localStorage will break the functionality of this application, as your work will not be saved. It is recommended that you do not disable it if you intend to use the application.</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">More Information</h2>
      <p>Hopefully, that has clarified things for you. If you are still looking for more information, you can contact us through our preferred contact methods.</p>
    </LegalPageLayout>
  );
}
