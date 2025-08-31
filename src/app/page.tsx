"use client";

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Lock,
  Unlock,
  FileUp,
  Loader2,
  Sparkles,
  Copy,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { encryptFile, decryptFile } from '@/lib/crypto';
import { generateQuiz, GenerateQuizOutput } from '@/ai/flows/suggest-passphrase';
import { Textarea } from '@/components/ui/textarea';

type Operation = 'encrypt' | 'decrypt';

export default function ConverterPage() {
  const [operation, setOperation] = useState<Operation>('encrypt');
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizTopic, setQuizTopic] = useState('General Knowledge');
  const [quizJson, setQuizJson] = useState('');

  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setQuizJson('');
    } else {
      setFile(null);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setQuizJson('');
    try {
      const result: GenerateQuizOutput = await generateQuiz({
        topic: quizTopic,
        numQuestions: 5,
      });
      const generatedJson = JSON.stringify(result, null, 2);
      setQuizJson(generatedJson);
      // Create a file object from the JSON
      const quizFile = new File([generatedJson], `${quizTopic.replace(/\s+/g, '_')}_quiz.json`, { type: 'application/json' });
      setFile(quizFile);

      toast({
        title: 'Quiz Generated!',
        description: `A 5-question quiz about ${quizTopic} has been created.`,
      });
    } catch (error) {
      console.error('AI Quiz generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not generate the quiz. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const downloadBlob = (blob: Blob, originalFileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    if (operation === 'encrypt') {
      a.download = `${originalFileName.split('.')[0]}.dat`;
    } else {
      a.download = originalFileName.endsWith('.dat')
        ? originalFileName.slice(0, -4)
        : `decrypted_${originalFileName}`;
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !passphrase) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a file and a passphrase.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      let resultBlob: Blob;
      if (operation === 'encrypt') {
        resultBlob = await encryptFile(file, passphrase);
        toast({
          title: 'Encryption Successful',
          description: 'Your file has been securely encrypted.',
        });
      } else {
        resultBlob = await decryptFile(file, passphrase);
        toast({
          title: 'Decryption Successful',
          description: 'Your file has been decrypted.',
        });
      }
      downloadBlob(resultBlob, file.name);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: `${
          operation === 'encrypt' ? 'Encryption' : 'Decryption'
        } Failed`,
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const canSubmit = useMemo(
    () => file && passphrase.length > 0,
    [file, passphrase]
  );

  return (
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">File Converter</CardTitle>
          <CardDescription className="text-muted-foreground">
            Encrypt and decrypt files, or generate an encrypted quiz file with AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={operation}
            onValueChange={(v) => setOperation(v as Operation)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="encrypt">
                <Lock className="mr-2 h-4 w-4" />
                Encrypt
              </TabsTrigger>
              <TabsTrigger value="decrypt">
                <Unlock className="mr-2 h-4 w-4" />
                Decrypt
              </TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="space-y-6">
                
                {operation === 'encrypt' && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">AI Quiz Generator</CardTitle>
                      <CardDescription>Generate a quiz JSON file to encrypt.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="quiz-topic">Quiz Topic</Label>
                        <Input 
                          id="quiz-topic"
                          value={quizTopic}
                          onChange={(e) => setQuizTopic(e.target.value)}
                          placeholder="e.g., World Capitals"
                        />
                      </div>
                      <Button type="button" onClick={handleGenerateQuiz} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Quiz
                      </Button>
                      {quizJson && (
                        <div className='space-y-2'>
                          <Label>Generated Quiz Data (JSON)</Label>
                          <Textarea value={quizJson} readOnly rows={8} className="font-mono text-xs"/>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="file-upload">
                    {operation === 'encrypt' ? 'File to Encrypt' : 'File to Decrypt (.dat)'}
                  </Label>
                  <Input 
                    id="file-upload" 
                    type="file" 
                    onChange={handleFileChange} 
                    accept={operation === 'decrypt' ? '.dat' : undefined}
                  />
                   {file && (
                    <div className="mt-2 text-sm text-center text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{file.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passphrase">Passphrase / Key</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter a strong passphrase"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-lg py-6"
                  disabled={isProcessing || !canSubmit}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : operation === 'encrypt' ? (
                    <Lock className="mr-2 h-5 w-5" />
                  ) : (
                    <Unlock className="mr-2 h-5 w-5" />
                  )}
                  {operation === 'encrypt'
                    ? 'Encrypt & Download (.dat)'
                    : 'Decrypt & Download'}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
  );
}
