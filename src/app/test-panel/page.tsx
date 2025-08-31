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
import { v4 as uuidv4 } from 'uuid';


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
        setQuizData(JSON.parse(data));
      } else {
        toast({
          variant: 'destructive',
          title: 'No Quiz Data',
          description: 'Please upload a quiz file first.',
        });
        router.push('/');
      }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Failed to load quiz',
            description: 'The quiz data is corrupted.',
        });
        router.push('/');
    }
  }, [router, toast]);
  
  // Effect to handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      sessionStorage.removeItem('quizData');
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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
      const submission = {
        answers,
        submittedAt: new Date().toISOString(),
      };
  
      // For simplicity, we'll store the submission data in a local .dat file.
      // In a real app, you would send this to a server.
      const passphrase = uuidv4(); // Generate a unique key for this submission.
      const submissionFile = new File([JSON.stringify([submission])], 'answers.json', { type: 'application/json' });
      const encryptedBlob = await encryptFile(submissionFile, passphrase);
      
      downloadBlob(encryptedBlob, 'answers.dat');

      toast({
        title: "Test Submitted!",
        description: `Your answers have been saved to answers.dat. The key for this file is: ${passphrase}`,
        duration: 20000, // Keep toast longer to copy key
      });
  
      sessionStorage.removeItem('quizData');
      router.push('/answer-sheets');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'There was an error submitting your answers.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  

  if (!quizData) {
    return <div>Loading quiz...</div>;
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
