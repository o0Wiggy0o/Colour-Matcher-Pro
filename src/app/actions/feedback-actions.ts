'use server';

import { z } from 'zod';

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "general"]),
  message: z.string(),
  email: z.string().optional(),
});

type FeedbackData = z.infer<typeof feedbackSchema>;

/**
 * Server action to handle feedback submission.
 * In a real application, this would send an email or save to a database.
 * For now, it logs the feedback to the server console.
 */
export async function submitFeedback(data: FeedbackData) {
  const result = feedbackSchema.safeParse(data);

  if (!result.success) {
    throw new Error('Invalid feedback data provided.');
  }

  console.log('--- New Feedback Received ---');
  console.log(`Type: ${result.data.type}`);
  console.log(`From: ${result.data.email || 'Anonymous'}`);
  console.log('Message:');
  console.log(result.data.message);
  console.log('-----------------------------');

  // Simulate a short network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return { success: true, message: 'Feedback received successfully.' };
}
