
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileUp, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const SALT_SIZE = 16;
const IV_SIZE = 12;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;

export default function ConverterLoaderPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [outputText, setOutputText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);
  const { toast } = useToast();

  async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const passBuf = new TextEncoder().encode(passphrase);
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      passBuf,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: KEY_LENGTH },
      false,
      ["decrypt"]
    );
  }

  async function tryDecrypt(buffer: ArrayBuffer, passphrase: string, fileType?: string) {
    const u8 = new Uint8Array(buffer);
    if (u8.length < SALT_SIZE + IV_SIZE + 1) {
      throw new Error("File too small to contain salt + iv + content");
    }

    const salt = u8.slice(0, SALT_SIZE);
    const iv = u8.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const encrypted = u8.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(passphrase, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted
    );

    const blob = new Blob([decryptedBuffer], { type: fileType || "application/octet-stream" });
    return blob;
  }

  function looksBinaryText(text: string) {
    // detect lots of low ASCII control chars -> treat as binary
    return /[\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E-\x1F]/.test(text);
  }

  async function handleLoad() {
    setError(null);
    setOutputText(null);
    setDecryptedBlob(null);

    if (!file) {
      setError("Please select a file to load.");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();

      const maybeText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const isBinary = looksBinaryText(maybeText);

      if (!isBinary) {
        setOutputText(maybeText);
        setDecryptedBlob(new Blob([buffer], { type: file.type || "text/plain" }));
        setLoading(false);
        return;
      }

      if (!passphrase || passphrase.trim().length === 0) {
        setError("File looks binary/encrypted. Provide the passphrase/key to decrypt.");
        setLoading(false);
        return;
      }

      const decrypted = await tryDecrypt(buffer, passphrase, file.type);
      const decText = await decrypted.text();
      const decIsBinary = looksBinaryText(decText);

      if (!decIsBinary) {
        setOutputText(decText);
        setDecryptedBlob(decrypted);
      } else {
        const arr = new Uint8Array(await decrypted.arrayBuffer());
        const previewLen = Math.min(256, arr.length);
        const hexPreview = Array.from(arr.slice(0, previewLen))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        setOutputText(`[binary output — first ${previewLen} bytes as hex]\n${hexPreview}`);
        setDecryptedBlob(decrypted);
      }
      toast({ title: "Success!", description: "File processed successfully." });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      toast({ variant: "destructive", title: "Processing Failed", description: err?.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setFile(null);
    setPassphrase("");
    setOutputText(null);
    setDecryptedBlob(null);
    setError(null);
  }

  function downloadBlob(blob: Blob, filename?: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || (file?.name?.replace(/\.dat$/i, ".dec") || "download.bin");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>File Decryptor & Viewer</CardTitle>
        <CardDescription>
          Select an encrypted file (e.g., <code>.dat</code>). If it was encrypted with a
          passphrase/key, provide it below to view the decrypted content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase / Key</Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase (if required for decryption)"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleLoad} disabled={loading || !file}>
              {loading ? <Loader2 className="animate-spin" /> : <FileUp />}
              {loading ? "Loading..." : "Load & Decrypt"}
            </Button>

            <Button variant="outline" onClick={resetAll} disabled={loading}>
              <Trash2 /> Reset
            </Button>

            {decryptedBlob && (
              <Button variant="secondary" onClick={() => downloadBlob(decryptedBlob)}>
                <Download /> Download Decrypted
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {outputText && (
          <div className="mt-4 space-y-2">
            <Label>Output Preview</Label>
            <Textarea
              readOnly
              value={outputText}
              className="h-64 font-mono text-xs"
              placeholder="Decrypted text will appear here..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
