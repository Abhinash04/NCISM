import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { db } from '@/lib/db/db';
import { formatBytes } from '@/lib/format';
import { Trash2, Sun, Moon, Monitor } from 'lucide-react';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(setStorage);
    }
  }, []);

  const handleClearAll = async () => {
    await db.transaction('rw', db.documents, db.artifacts, db.assessments, async () => {
      await db.artifacts.clear();
      await db.assessments.clear();
      await db.documents.clear();
    });
    toast.success('Local document store cleared');
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(setStorage);
    }
  };

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Appearance and local storage.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-sans">Appearance</CardTitle>
          <CardDescription>Theme for the whole application.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {themes.map((t) => (
            <Button
              key={t.value}
              variant={theme === t.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(t.value)}
            >
              <t.icon className="w-4 h-4 mr-2" /> {t.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-sans">Local storage</CardTitle>
          <CardDescription>
            Extracted documents and assessment reports are stored in this browser so they
            survive the server's retention window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {storage && (
            <p className="text-sm text-muted-foreground">
              Using <span className="font-medium text-foreground">{formatBytes(storage.usage)}</span> of{' '}
              {formatBytes(storage.quota)} available.
            </p>
          )}
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear all local documents
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
