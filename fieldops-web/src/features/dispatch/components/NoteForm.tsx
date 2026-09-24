'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/errors';
import { useAddNote } from '../hooks/useTaskActions';

export function NoteForm({ taskId }: { taskId: string }) {
  const [text, setText] = useState('');
  const addNote = useAddNote(taskId);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await addNote.mutateAsync(trimmed);
      setText('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Impossible d'ajouter la note.");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Ajouter une note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={addNote.isPending}
      />
      <Button size="sm" onClick={submit} disabled={addNote.isPending || !text.trim()}>
        {addNote.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Ajouter'}
      </Button>
    </div>
  );
}
