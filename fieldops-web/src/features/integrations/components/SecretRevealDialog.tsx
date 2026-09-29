'use client';

import { Check, Copy, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Affichage unique d'un secret (clé API, secret de signature) : il n'est plus jamais relisible ensuite. */
export function SecretRevealDialog({
  secret,
  title,
  hint,
  onClose,
}: {
  secret: string | null;
  title: string;
  hint: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open={!!secret} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <ShieldAlert className="mt-0.5 size-4 flex-none" />
          <p>Copiez cette valeur maintenant : elle ne sera plus jamais affichée. {hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">{secret}</code>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>J&apos;ai copié la valeur</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
