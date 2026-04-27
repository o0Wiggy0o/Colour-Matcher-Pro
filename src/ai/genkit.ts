// Before you start, make sure you have the Google Cloud SDK installed and authenticated.

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// When running in production on App Hosting, the GOOGLE_API_KEY will be
// automatically populated from the secret GOOGLE_GENAI_KEY you configured in your Firebase project.
// For local development with the Firebase Emulator, the key is not required.
if (!process.env.GOOGLE_GENAI_KEY && process.env.NODE_ENV === 'production') {
  throw new Error(
    'The GOOGLE_GENAI_KEY secret is not configured for this App Hosting backend. For more details, see https://firebase.google.com/docs/app-hosting/manage-secrets'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_KEY || 'dummy-api-key-for-local',
    }),
  ],
  model: 'googleai/gemini-1.0-pro',
});
