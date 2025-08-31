'use server';

/**
 * @fileOverview A passphrase suggestion AI agent.
 *
 * - suggestPassphrase - A function that suggests a strong passphrase.
 * - SuggestPassphraseInput - The input type for the suggestPassphrase function.
 * - SuggestPassphraseOutput - The return type for the suggestPassphrase function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPassphraseInputSchema = z.object({
  fileType: z.string().describe('The type of the file to be encrypted.'),
});
export type SuggestPassphraseInput = z.infer<typeof SuggestPassphraseInputSchema>;

const SuggestPassphraseOutputSchema = z.object({
  passphrase: z.string().describe('A strong, randomly generated passphrase.'),
});
export type SuggestPassphraseOutput = z.infer<typeof SuggestPassphraseOutputSchema>;

export async function suggestPassphrase(input: SuggestPassphraseInput): Promise<SuggestPassphraseOutput> {
  return suggestPassphraseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPassphrasePrompt',
  input: {schema: SuggestPassphraseInputSchema},
  output: {schema: SuggestPassphraseOutputSchema},
  prompt: `You are a security expert. Generate a strong passphrase for encrypting a file of type {{{fileType}}}. The passphrase should be at least 16 characters long and include a mix of uppercase letters, lowercase letters, numbers, and symbols. Return the generated passphrase.`, 
});

const suggestPassphraseFlow = ai.defineFlow(
  {
    name: 'suggestPassphraseFlow',
    inputSchema: SuggestPassphraseInputSchema,
    outputSchema: SuggestPassphraseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
