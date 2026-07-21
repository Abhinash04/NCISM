import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SYSTEM_LABELS = { ayurveda: 'Ayurveda', unani: 'Unani', siddha: 'Siddha', sowa_rigpa: 'Sowa-Rigpa' };
const MAX_RESULTS = 50;

/** True if every char of `q` appears in order within `text` (loose fuzzy fallback). */
function isSubsequence(text, q) {
  let i = 0;
  for (let j = 0; j < text.length && i < q.length; j += 1) {
    if (text[j] === q[i]) i += 1;
  }
  return i === q.length;
}

/**
 * Ranks an institution against the query and returns the best matched field +
 * substring range for highlighting. Higher score = better match; null = no match.
 */
function scoreInstitution(inst, q) {
  const id = (inst.institute_id || '').toLowerCase();
  const name = (inst.name || '').toLowerCase();
  const state = (inst.state || '').toLowerCase();

  if (id === q) return { score: 1000, field: 'institute_id', index: 0 };
  if (id.startsWith(q)) return { score: 900, field: 'institute_id', index: 0 };
  if (id.includes(q)) return { score: 800, field: 'institute_id', index: id.indexOf(q) };
  if (name.startsWith(q)) return { score: 700, field: 'name', index: 0 };
  if (name.includes(q)) return { score: 600, field: 'name', index: name.indexOf(q) };
  if (state.includes(q)) return { score: 500, field: 'state', index: state.indexOf(q) };
  if (isSubsequence(name, q)) return { score: 300, field: null, index: -1 };
  return null;
}

/** Renders `text` with the `[index, index+len)` slice wrapped in a highlight mark. */
function Highlight({ text, index, length }) {
  if (index == null || index < 0 || !length) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-primary/20 text-foreground rounded-[2px] px-0.5">{text.slice(index, index + length)}</mark>
      {text.slice(index + length)}
    </>
  );
}

export function InstitutionCombobox({ institutions = [], value, onChange, loading }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => institutions.find((i) => i.id === value) || null,
    [institutions, value],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return institutions.slice(0, MAX_RESULTS).map((inst) => ({ inst, match: null }));
    const scored = [];
    for (const inst of institutions) {
      const match = scoreInstitution(inst, q);
      if (match) scored.push({ inst, match });
    }
    scored.sort((a, b) => b.match.score - a.match.score || a.inst.institute_id.localeCompare(b.inst.institute_id));
    return scored.slice(0, MAX_RESULTS);
  }, [institutions, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm',
            'ring-offset-background transition-colors hover:border-primary/50',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading institutions…
            </span>
          ) : selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs font-medium text-primary shrink-0">{selected.institute_id}</span>
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" /> Search institution by name, ID, or state…
            </span>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] gap-0 p-0 overflow-hidden',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      >
        <Command shouldFilter={false} className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Type to search…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto overflow-x-hidden p-1">
            <Command.Empty className="flex flex-col items-center gap-1 px-3 py-8 text-center">
              <Building2 className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No institution matches {query ? <span className="font-medium text-foreground">“{query}”</span> : 'your search'}.
              </p>
            </Command.Empty>
            {results.map(({ inst, match }) => (
              <Command.Item
                key={inst.id}
                value={inst.id}
                onSelect={() => { onChange(inst.id); setOpen(false); setQuery(''); }}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm',
                  'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                )}
              >
                <span className="font-mono text-xs font-medium text-primary shrink-0 w-16">
                  {match?.field === 'institute_id'
                    ? <Highlight text={inst.institute_id} index={match.index} length={query.trim().length} />
                    : inst.institute_id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {match?.field === 'name'
                      ? <Highlight text={inst.name} index={match.index} length={query.trim().length} />
                      : inst.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {match?.field === 'state'
                      ? <Highlight text={inst.state} index={match.index} length={query.trim().length} />
                      : inst.state}
                    {inst.system ? ` · ${SYSTEM_LABELS[inst.system] || inst.system}` : ''}
                  </span>
                </span>
                {inst.id === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
