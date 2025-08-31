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

// Helper function to convert 2D array from xlsx to the QuizData format
function convertArrayToQuizData(data: any[][]): QuizData | null {
  if (!data || data.length < 2) {
    return null; // Should have at least a header and one question
  }
  
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const questionIndex = headers.indexOf('question');
  const optionsIndex = headers.indexOf('options');
  const correctIndex = headers.indexOf('correctanswer');

  if (questionIndex === -1 || optionsIndex === -1 || correctIndex === -1) {
    return null; // Missing required columns
  }

  const questions: Question[] = data.slice(1).map(row => {
    const options = String(row[optionsIndex]).split(',').map(opt => opt.trim());
    return {
      question: String(row[questionIndex]),
      options: options,
      correctAnswer: String(row[correctIndex]),
    };
  }).filter(q => q.question); // Filter out empty rows

  return { questions };
}


export default function PreviewPage() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [xlsxPreviewData, setXlsxPreviewData] = useState<any[][] | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('quizData');
      if (data) {
        const parsedData = JSON.parse(data);
        // This handles data from both AI generator (already in QuizData format)
        // and from the XLSX upload (2D array)
        if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
            setXlsxPreviewData(parsedData);
            const convertedData = convertArrayToQuizData(parsedData);
            if (!convertedData) {
                 throw new Error("The Excel file is missing required columns: 'question', 'options', 'correctAnswer'.");
            }
            setQuizData(convertedData);
        } else if (parsedData && Array.isArray(parsedData.questions) && parsedData.questions.length > 0) {
          setQuizData(parsedData);
        } else {
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
      // But we must ensure it's the final QuizData format, not the array format.
      sessionStorage.setItem('quizData', JSON.stringify(quizData));
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
  
  const getPreviewData = () => {
    if (xlsxPreviewData) {
        return xlsxPreviewData;
    }
    if(quizData) {
        // Convert quizData back to array for preview if needed
        const header = ["question", "options", "correctAnswer"];
        const rows = quizData.questions.map(q => [q.question, q.options.join(','), q.correctAnswer]);
        return [header, ...rows];
    }
    return null;
  }

  const previewData = getPreviewData();

  if (!previewData) {
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
  
  const tableHeaders = previewData[0];
  const tableRows = previewData.slice(1);

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
                 {tableHeaders.map((head: any, i: number) => (
                    <TableHead key={i}>{String(head)}</TableHead>
                 ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row, index) => (
                <TableRow key={index}>
                    {row.map((cell: any, j: number) => (
                        <TableCell key={j} className="font-medium">{String(cell)}</TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleStartTest} disabled={!quizData}>
          Start Test <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
