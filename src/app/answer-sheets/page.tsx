"use client";

import { useState, useEffect } from 'react';
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
  const [answerSheets, setAnswerSheets] = useState<AnswerSheet[]>([]);
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
    setAnswerSheets([]);

    try {
      const decryptedBlob = await decryptFile(file, key);
      const decryptedText = await decryptedBlob.text();
      const data = JSON.parse(decryptedText);

      if (Array.isArray(data)) {
        setAnswerSheets(data);
      } else {
        throw new Error("File does not contain a valid list of answer sheets.");
      }

      toast({
        title: 'Success!',
        description: 'Answer sheets loaded.',
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
          <CardTitle>View Answer Sheets</CardTitle>
          <CardDescription>
            Upload an encrypted .dat file containing student submissions to view their answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="answers-file">Submissions File (.dat)</Label>
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
            Load and Decrypt Answers
          </Button>
        </CardContent>
      </Card>

      {answerSheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Submissions</CardTitle>
            <CardDescription>Click on a submission to view the answers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {answerSheets.map((sheet, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <span>Submission {index + 1}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(sheet.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pl-4">
                      {Object.entries(sheet.answers).map(([qIndex, answer]) => (
                        <li key={qIndex} className="text-sm">
                          <span className="font-semibold">Question {parseInt(qIndex) + 1}:</span> {answer || 'Not answered'}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
