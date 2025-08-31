"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizData {
  questions: Question[];
}

export default function PreviewPage() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('quizData');
      if (data) {
        const parsedData = JSON.parse(data);
        // More robust validation
        if (parsedData && Array.isArray(parsedData.questions) && parsedData.questions.length > 0) {
          setQuizData(parsedData);
        } else {
          // This path was being hit incorrectly before.
          throw new Error("The file is valid, but it does not contain any questions.");
        }
      }
      // If no data, just render the 'No Quiz' message without an error.
    } catch (error: any) {
      console.error("Failed to load quiz data for preview:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Load Preview',
        description: error.message || 'The quiz data might be corrupted. Please try uploading it again.',
      });
      // Clear potentially corrupted data and redirect
      sessionStorage.removeItem('quizData');
      router.push('/upload-quiz');
    }
  }, [router, toast]);

  const handleStartTest = () => {
    if (quizData) {
      // The data is already in sessionStorage, so we just navigate.
      router.push('/test-panel');
    } else {
      toast({
        variant: 'destructive',
        title: 'No Quiz Data',
        description: 'Something went wrong. Please upload a quiz file again.',
      });
      router.push('/');
    }
  };

  if (!quizData) {
    return (
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle>No Quiz to Preview</CardTitle>
          <CardDescription>
            Go to the 'Upload Quiz' page to load a quiz file and see a preview here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/upload-quiz')}>Go to Upload Page</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Quiz Preview</CardTitle>
        <CardDescription>
          Here are the questions loaded from your file. Click "Start Test" when you're ready.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableCaption>A list of the questions in your quiz.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Options</TableHead>
                <TableHead className="text-right">Correct Answer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizData.questions.map((q, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{q.question}</TableCell>
                  <TableCell>{q.options.join(', ')}</TableCell>
                  <TableCell className="text-right">{q.correctAnswer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleStartTest}>
          Start Test <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
