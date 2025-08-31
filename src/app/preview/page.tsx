
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
  
  const headers = data[0].map(h => String(h).toLowerCase().trim().replace(/\s+/g, ''));
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
  }).filter(q => q.question && q.question.trim() !== ''); // Filter out empty rows

  if (questions.length === 0) return null;

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
      if (!data) {
        // No data found, do nothing and let the default "No Quiz to Preview" message show.
        return;
      }

      const parsedData = JSON.parse(data);
      
      // Case 1: Data is from the AI generator (already in QuizData format)
      if (parsedData && Array.isArray(parsedData.questions)) {
        setQuizData(parsedData);
        setXlsxPreviewData(null); // Clear any old XLSX data
      } 
      // Case 2: Data is from an XLSX file (a 2D array)
      else if (parsedData && Array.isArray(parsedData) && Array.isArray(parsedData[0])) {
        setXlsxPreviewData(parsedData); // Keep the raw data for table display
        const convertedData = convertArrayToQuizData(parsedData);
        if (!convertedData) {
             throw new Error("The file is missing required columns: 'question', 'options', 'correctAnswer'. Check spelling and casing in the Excel file header.");
        }
        setQuizData(convertedData);
      } else {
        // The data is in an unknown or invalid format
        throw new Error("The provided quiz data is not in a recognized format.");
      }
    } catch (error: any) {
      console.error("Failed to load quiz data for preview:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Load Preview',
        description: error.message || 'The quiz data might be corrupted. Please try again.',
      });
      // Clear potentially corrupted data and redirect
      sessionStorage.removeItem('quizData');
      router.push('/upload-quiz');
    }
  }, [router, toast]);

  const handleStartTest = () => {
    if (quizData) {
      // The data is already in sessionStorage, but we ensure it's the final,
      // converted QuizData format before proceeding.
      sessionStorage.setItem('quizData', JSON.stringify(quizData));
      router.push('/test-panel');
    } else {
      toast({
        variant: 'destructive',
        title: 'No Quiz Data',
        description: 'Something went wrong. Please upload a quiz file again.',
      });
      router.push('/upload-quiz');
    }
  };
  
  const getPreviewData = () => {
    // If we have raw XLSX data, use that for the preview table
    if (xlsxPreviewData) {
        return xlsxPreviewData;
    }
    // Otherwise, convert the AI-generated quiz data back to an array for the table
    if(quizData) {
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
            Generate a quiz or use the 'Upload Quiz' page to load a quiz file.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 justify-center">
          <Button onClick={() => router.push('/')}>Generate Quiz</Button>
          <Button onClick={() => router.push('/upload-quiz')} variant="outline">Upload Quiz</Button>
        </CardContent>
      </Card>
    );
  }
  
  const tableHeaders = previewData[0] || [];
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
