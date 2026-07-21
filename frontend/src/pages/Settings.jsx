import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { db } from '@/lib/db/db';
import { formatBytes } from '@/lib/format';
import { Trash2, Sun, Moon, Monitor, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { mfaEnroll, mfaVerify, mfaDisable } from '@/features/auth/auth.api';

/** Two-factor (TOTP) self-enrollment: enroll → scan QR → verify a code → enabled. */
function MfaCard() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(!!user?.mfaEnabled);
  const [enroll, setEnroll] = useState(null); // { secret, qr } while enrolling
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    try { setEnroll(await mfaEnroll()); }
    catch (err) { toast.error(err?.response?.data?.error?.message || 'Could not start enrollment'); }
    finally { setBusy(false); }
  }

  async function confirm(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await mfaVerify(code);
      setEnabled(true); setEnroll(null); setCode('');
      toast.success('Two-factor authentication enabled');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Incorrect code');
    } finally { setBusy(false); }
  }

  async function turnOff() {
    setBusy(true);
    try { await mfaDisable(); setEnabled(false); toast.success('Two-factor authentication disabled'); }
    catch (err) { toast.error(err?.response?.data?.error?.message || 'Could not disable'); }
    finally { setBusy(false); }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-sans flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Two-factor authentication
        </CardTitle>
        <CardDescription>
          Require a time-based code from an authenticator app (Google Authenticator, Authy, …) at sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Enabled</p>
            <Button variant="outline" size="sm" onClick={turnOff} disabled={busy}>Disable</Button>
          </div>
        ) : enroll ? (
          <form onSubmit={confirm} className="space-y-4">
            <p className="text-sm text-muted-foreground">Scan this QR in your authenticator app, then enter the code it shows.</p>
            <img src={enroll.qr} alt="MFA QR code" className="h-44 w-44 rounded border bg-white p-2" />
            <p className="text-xs text-muted-foreground break-all">
              Or enter this key manually: <span className="font-mono text-foreground">{enroll.secret}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input id="mfa-code" inputMode="numeric" maxLength={6} value={code} placeholder="123456"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? 'Verifying…' : 'Enable'}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setEnroll(null); setCode(''); }}>Cancel</Button>
            </div>
          </form>
        ) : (
          <Button variant="default" size="sm" onClick={begin} disabled={busy}>
            {busy ? 'Starting…' : 'Set up two-factor'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

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

      <MfaCard />

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
