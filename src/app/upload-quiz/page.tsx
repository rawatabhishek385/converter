"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { decryptFile } from '@/lib/crypto';
import { Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuestionUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Check for data passed from the converter page
    const encryptedData = sessionStorage.getItem('encryptedData');
    const encryptedKey = sessionStorage.getItem('encryptedDataKey');
    const encryptedName = sessionStorage.getItem('encryptedDataName');
    
    if (encryptedData && encryptedKey && encryptedName) {
      // Clear the session storage items so this doesn't run again
      sessionStorage.removeItem('encryptedData');
      sessionStorage.removeItem('encryptedDataKey');
      sessionStorage.removeItem('encryptedDataName');
      
      // Convert base64 to blob, then to file
      fetch(encryptedData)
        .then(res => res.blob())
        .then(blob => {
          const passedFile = new File([blob], encryptedName, { type: 'application/octet-stream' });
          setFile(passedFile);
          setKey(encryptedKey);
          
          toast({
            title: "Data Received!",
            description: "Encrypted data and key have been pre-filled. Click 'Load Questions' to proceed.",
          });
        });
    }
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !key) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a .dat file and enter the key.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const decryptedBlob = await decryptFile(file, key);
      const decryptedText = await decryptedBlob.text();
      const quizData = JSON.parse(decryptedText);

      // Store in session storage to pass to the preview page
      sessionStorage.setItem('quizData', JSON.stringify(quizData));
      
      toast({
        title: 'Success!',
        description: 'Quiz data loaded. Redirecting to the preview page.',
      });

      router.push('/preview');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not load the quiz. Check the file and key.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Question Uploader</CardTitle>
        <CardDescription>Upload your encrypted .dat quiz file to start a test.</CardDescription>
      </CardHeader>
      <CardContent>
        {file && (
          <div className="mb-4 text-sm text-center text-muted-foreground bg-secondary p-2 rounded-md">
            File ready to be processed: <span className="font-medium text-foreground">{file.name}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Quiz File (.dat)</Label>
            <Input id="file-upload" type="file" accept=".dat" onChange={handleFileChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">Decryption Key</Label>
            <Input
              id="key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter the key"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isProcessing || !file && !key}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Load Questions
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
