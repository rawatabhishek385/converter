"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { encryptFile } from '@/lib/crypto';
import { format } from 'date-fns';


interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface QuizData {
  questions: Question[];
}

export default function TestPanelPage() {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('quizData');
      if (data) {
        const parsedData = JSON.parse(data);
        // Basic validation
        if (parsedData && Array.isArray(parsedData.questions) && parsedData.questions.length > 0) {
           setQuizData(parsedData);
        } else {
            throw new Error("Invalid quiz data format. The 'questions' array is missing or empty.");
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'No Quiz Data',
          description: 'Please upload a quiz file first.',
        });
        router.push('/');
      }
    } catch (error: any) {
        console.error("Failed to load quiz data:", error);
        toast({
            variant: 'destructive',
            title: 'Failed to load quiz',
            description: error.message || 'The quiz data is corrupted or invalid. Please upload again.',
        });
        router.push('/');
    }
  }, [router, toast]);

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: value }));
  };

  const handleNext = () => {
    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submissionTime = new Date();
      const newSubmission = {
        answers,
        submittedAt: submissionTime.toISOString(),
      };
  
      const passphrase = prompt("Please set a key for the answer sheet file. This key will be required to view the answers.");
      if (!passphrase) {
        toast({
            variant: "destructive",
            title: "Submission Canceled",
            description: "You must provide a key to save your answers.",
        });
        setIsSubmitting(false);
        return;
      }
      
      const submissionFile = new File([JSON.stringify(newSubmission, null, 2)], 'submission.json', { type: 'application/json' });
      const encryptedBlob = await encryptFile(submissionFile, passphrase);
      
      const fileName = `submission_${format(submissionTime, 'yyyyMMdd_HHmmss')}.dat`;
      downloadBlob(encryptedBlob, fileName);

      toast({
        title: "Test Submitted!",
        description: `Your answers have been saved to ${fileName}. You can view it on the Answer Sheets page. Make sure to remember your key.`,
        duration: 10000, 
      });
  
      sessionStorage.removeItem('quizData');
      router.push('/answer-sheets');
    } catch (error: any)
{
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'There was an error submitting your answers.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  

  if (!quizData) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <p className="text-lg font-semibold">Loading quiz...</p>
                <p className="text-sm text-muted-foreground">Please wait while we prepare the test.</p>
            </div>
        </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;


  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Test Panel</CardTitle>
        <CardDescription>Answer the questions below.</CardDescription>
        <Progress value={progress} className="mt-2" />
        <p className="text-sm text-muted-foreground text-center mt-2">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="font-semibold text-lg">{currentQuestion.question}</p>
          <RadioGroup value={answers[currentQuestionIndex]} onValueChange={handleAnswerChange}>
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handlePrev} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        {!isLastQuestion ? (
          <Button onClick={handleNext}>Next</Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSubmitting}>Submit Test</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                <AlertDialogDescription>
                  You cannot change your answers after submitting. Your answers will be downloaded as an encrypted .dat file.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
