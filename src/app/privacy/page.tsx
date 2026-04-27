import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal-page-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy - Colour Matcher Pro',
  description: 'Our privacy policy explains what data Colour Matcher Pro stores (locally on your device) and how we handle your privacy.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p><strong>Last Updated:</strong> October 26, 2023</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">1. Information We Collect</h2>
      <p>Colour Matcher Pro is designed with your privacy in mind. We do not collect or store any personally identifiable information (PII) on our servers. All data you create, such as color palettes, jobs, and notes, is stored locally in your web browser's localStorage.</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">2. How We Use Your Information</h2>
      <p>Since all data is stored locally on your device, we do not have access to it. The data is used solely by the application running in your browser to provide its functionality, such as persisting your work between sessions.</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">3. Data Sharing and Disclosure</h2>
      <p>We do not share, sell, rent, or trade your information with any third parties, as we do not have access to it.</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">4. Cookies and Local Storage</h2>
      <p>We use your browser's localStorage to save your application data and preferences (like the dark/light theme). We do not use tracking cookies. Please see our Cookie Policy for more details.</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">5. Your Data, Your Control</h2>
      <p>You have full control over your data. You can delete it at any time by clearing your browser's site data for our domain. We also provide an "Export Data" feature which allows you to back up your information to your own computer.</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">6. Changes to This Policy</h2>
      <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
    </LegalPageLayout>
  );
}
