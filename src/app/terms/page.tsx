import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal-page-layout';

export const metadata: Metadata = {
  title: 'Terms of Service - Colour Matcher Pro',
  description: 'Read the Terms of Service for using the Colour Matcher Pro web application.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <p><strong>Last Updated:</strong> October 26, 2023</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">1. Introduction</h2>
      <p>Welcome to Colour Matcher Pro ("we", "our", "us"). These Terms of Service ("Terms") govern your use of our web application (the "Service"). By using the Service, you agree to these Terms.</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">2. Use of Service</h2>
      <p>You may use our Service only for lawful purposes. You agree not to use the Service:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li>In any way that violates any applicable national or international law or regulation.</li>
        <li>To engage in any activity that is harmful, fraudulent, or deceptive.</li>
      </ul>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">3. Data Storage</h2>
      <p>All data you create and save within the application, including color palettes and project information, is stored locally on your device using your browser's localStorage. We do not transmit this data to our servers. You are responsible for backing up your own data using the export features provided.</p>

      <h2 className="text-xl font-semibold text-foreground pt-4">4. Disclaimers</h2>
      <p>The Service is provided "as is". We make no warranties, expressed or implied, and hereby disclaim all other warranties including, without limitation, implied warranties of merchantability or fitness for a particular purpose. The color conversions (e.g., Pantone to CMYK) are provided for reference only and are not guaranteed to be exact. Always perform a physical test print for color-critical work.</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">5. Limitation of Liability</h2>
      <p>In no event shall we be liable for any damages (including, without limitation, damages for loss of data or profit) arising out of the use or inability to use the Service.</p>
      
      <h2 className="text-xl font-semibold text-foreground pt-4">6. Changes to Terms</h2>
      <p>We may revise these Terms at any time. By using this Service, you are expected to review these Terms on a regular basis.</p>
    </LegalPageLayout>
  );
}
