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
} from 'lucide-react';
import { encryptFile, decryptFile } from '@/lib/crypto';
import { suggestPassphrase } from '@/ai/flows/suggest-passphrase';

type Operation = 'encrypt' | 'decrypt';

export default function Home() {
  const [operation, setOperation] = useState<Operation>('encrypt');
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedPassphrase, setSuggestedPassphrase] = useState('');

  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('bg-accent/20');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setFile(event.dataTransfer.files[0]);
    }
  }, []);

  const onDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('bg-accent/20');
  };

  const onDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.currentTarget.classList.remove('bg-accent/20');
  };

  const handleSuggestPassphrase = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a file before suggesting a passphrase.',
      });
      return;
    }
    setIsSuggesting(true);
    setSuggestedPassphrase('');
    try {
      const result = await suggestPassphrase({
        fileType: file.type || 'unknown',
      });
      setSuggestedPassphrase(result.passphrase);
    } catch (error) {
      console.error('AI Passphrase suggestion error:', error);
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: 'Could not generate a passphrase. Please try again.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied!',
        description: 'Passphrase copied to clipboard.',
      });
      setPassphrase(text);
      setSuggestedPassphrase('');
    });
  };

  const downloadBlob = (blob: Blob, originalFileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    if (operation === 'encrypt') {
      a.download = `${originalFileName}.dat`;
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
        description: 'Please select a file and enter a passphrase.',
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

  const formContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="file-upload">Step 1: Upload a File</Label>
        <Label
          htmlFor="file-upload-input"
          className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card hover:bg-accent/10 transition-colors p-8 text-center"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="font-semibold text-primary">
            Click to upload or drag and drop
          </span>
          <span className="text-sm text-muted-foreground">
            Any file type, processed locally
          </span>
          <Input
            id="file-upload-input"
            type="file"
            className="sr-only"
            onChange={handleFileChange}
          />
        </Label>
        {file && (
          <div className="mt-2 text-sm text-center text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{file.name}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="passphrase">Step 2: Enter Passphrase</Label>
        <div className="relative">
          <Input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter a strong passphrase"
            required
            className="pr-10"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSuggestPassphrase}
            disabled={isSuggesting || !file}
          >
            {isSuggesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Suggest with AI
          </Button>
        </div>

        {suggestedPassphrase && (
          <div className="mt-2 flex items-center gap-2 rounded-md border bg-card p-3">
            <p className="flex-1 text-sm font-mono truncate">
              {suggestedPassphrase}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(suggestedPassphrase)}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy passphrase</span>
            </Button>
          </div>
        )}
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
          ? 'Encrypt & Download'
          : 'Decrypt & Download'}
      </Button>
    </div>
  );

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">CipherFile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Securely encrypt and decrypt your files right in your browser.
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
            <form onSubmit={handleSubmit}>
              <TabsContent value="encrypt" className="pt-6">
                {formContent()}
              </TabsContent>
              <TabsContent value="decrypt" className="pt-6">
                {formContent()}
              </TabsContent>
            </form>
          </Tabs>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} CipherFile. All files are processed
          locally on your device.
        </p>
      </footer>
    </main>
  );
}
