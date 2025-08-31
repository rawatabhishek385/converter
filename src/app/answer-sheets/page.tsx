"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { decryptFile } from '@/lib/crypto';
import { Loader2, UploadCloud } from 'lucide-react';

interface AnswerSheet {
  answers: { [key: string]: string };
  submittedAt: string;
}

export default function AnswerSheetsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [answerSheet, setAnswerSheet] = useState<AnswerSheet | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleLoadFile = async () => {
    if (!file || !key) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a file and provide the key.',
      });
      return;
    }

    setIsProcessing(true);
    setAnswerSheet(null);

    try {
      const decryptedBlob = await decryptFile(file, key);
      const decryptedText = await decryptedBlob.text();
      const data = JSON.parse(decryptedText);

      // Simple validation to check if it looks like our submission object
      if (data && typeof data === 'object' && data.answers && data.submittedAt) {
        setAnswerSheet(data);
      } else {
        throw new Error("File does not contain a valid answer sheet.");
      }

      toast({
        title: 'Success!',
        description: 'Answer sheet loaded.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Load Answers',
        description: error.message || 'Check the file and key.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>View Answer Sheet</CardTitle>
          <CardDescription>
            Upload an encrypted .dat file containing a student submission to view their answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="answers-file">Submission File (.dat)</Label>
              <Input id="answers-file" type="file" accept=".dat" onChange={handleFileChange} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="answers-key">Decryption Key</Label>
              <Input
                id="answers-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter decryption key"
              />
            </div>
          </div>
          <Button onClick={handleLoadFile} disabled={isProcessing || !file || !key}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Load and Decrypt Answer
          </Button>
        </CardContent>
      </Card>

      {answerSheet && (
        <Card>
          <CardHeader>
            <CardTitle>Review Submission</CardTitle>
            <CardDescription>
              Showing answers from <span className="font-semibold">{file?.name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Submitted on: {new Date(answerSheet.submittedAt).toLocaleString()}
              </div>
              <ul className="space-y-2 rounded-md border p-4">
                {Object.entries(answerSheet.answers).map(([qIndex, answer]) => (
                  <li key={qIndex} className="text-sm">
                    <span className="font-semibold">Question {parseInt(qIndex) + 1}:</span> {answer || 'Not answered'}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
