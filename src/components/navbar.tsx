"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { FileQuestion, FileUp, Files, BookOpenCheck } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Upload Quiz', icon: FileUp },
  { href: '/test-panel', label: 'Test Panel', icon: FileQuestion },
  { href: '/answer-sheets', label: 'Answer Sheets', icon: Files },
  { href: '/converter', label: 'Converter', icon: BookOpenCheck },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <nav className="flex items-center space-x-4 lg:space-x-6">
            <Link href="/" className="mr-6 flex items-center space-x-2">
                <BookOpenCheck className="h-6 w-6" />
                <span className="font-bold sm:inline-block">QuizApp</span>
            </Link>
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary hidden sm:inline-block',
                pathname === href ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
