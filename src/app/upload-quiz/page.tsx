
"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileUp, BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";

/**
 * Converter Loader Page — fixed to correctly decrypt AES-GCM encrypted `.dat` files
 * and fetch the original Excel (.xlsx) data using the passphrase.
 *
 * Flow:
 *  - Upload a `.dat` file
 *  - Provide the passphrase (e.g., "hero")
 *  - The page extracts salt (16B) + iv (12B) + ciphertext + tag(16B)
 *  - Uses PBKDF2-HMAC-SHA256 (100k iterations) → AES-256-GCM to decrypt
 *  - Parses XLSX using SheetJS and shows a preview table of first rows
 */

const SALT_SIZE = 16;
const IV_SIZE = 12;
const TAG_SIZE = 16;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;

export default function ConverterLoaderPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[][] | null>(null);
  const [downloadableBlob, setDownloadableBlob] = useState<Blob | null>(null);
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

  async function decryptDatFile(buffer: ArrayBuffer, passphrase: string): Promise<Blob> {
    const u8 = new Uint8Array(buffer);
    if (u8.length < SALT_SIZE + IV_SIZE + TAG_SIZE + 1) {
      throw new Error("File too small to contain salt + iv + ciphertext + tag");
    }

    const salt = u8.slice(0, SALT_SIZE);
    const iv = u8.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = u8.slice(SALT_SIZE + IV_SIZE, u8.length - TAG_SIZE);
    const tag = u8.slice(u8.length - TAG_SIZE);

    const key = await deriveKey(passphrase, salt);

    // Concatenate ciphertext + tag because WebCrypto expects them together
    const ctWithTag = new Uint8Array(ciphertext.length + tag.length);
    ctWithTag.set(ciphertext, 0);
    ctWithTag.set(tag, ciphertext.length);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ctWithTag
    );

    return new Blob([decryptedBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  async function handleLoad() {
    setError(null);
    setPreview(null);
    setDownloadableBlob(null);

    if (!file) {
      setError("Please select a file to load.");
      return;
    }

    if (!passphrase) {
      setError("Please provide a passphrase.");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const decryptedBlob = await decryptDatFile(buffer, passphrase);
      setDownloadableBlob(decryptedBlob);

      // Parse XLSX and show preview
      const arrayBuffer = await decryptedBlob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setPreview(jsonData.slice(0, 10)); // preview first 10 rows
      
      toast({
        title: "Success!",
        description: "File decrypted and preview loaded.",
      });

    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || String(err);
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Decryption Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  function downloadFile() {
    if (!downloadableBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(downloadableBlob);
a.download = file?.name?.replace(/\.dat$/i, ".xlsx") || "decrypted.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Converter — Decrypt & Load XLSX</CardTitle>
        <CardDescription>
          Select an encrypted <code>.dat</code> file and provide the passphrase to view the original Excel content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Encrypted File (.dat)</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              accept=".dat"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase / Key</Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase (e.g., hero)"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleLoad} disabled={loading || !file || !passphrase}>
              {loading ? <Loader2 className="animate-spin" /> : <BookOpen />}
              {loading ? "Decrypting..." : "Load & Decrypt"}
            </Button>

            {downloadableBlob && (
              <Button variant="secondary" onClick={downloadFile}>
                <Download /> Download XLSX
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {preview && (
          <div className="mt-6">
            <CardTitle className="text-lg mb-2">Excel Data Preview</CardTitle>
            <div className="border rounded-md">
              <Table>
                <TableCaption>Showing the first 10 rows of the decrypted Excel file.</TableCaption>
                <TableHeader>
                  <TableRow>
                    {preview[0]?.map((head, i) => (
                      <TableHead key={i}>{String(head)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(1).map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell: any, j: number) => (
                        <TableCell key={j}>{String(cell)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
