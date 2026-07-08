import { useHealthCheck } from '@/hooks/useHealthCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Server, Database, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SystemHealthWidget() {
  const { status } = useHealthCheck();

  const services = [
    {
      name: 'Frontend',
      description: 'React UI',
      icon: Globe,
      status: 'online',
    },
    {
      name: 'Express Adapter',
      description: 'API Gateway',
      icon: Server,
      status: status === 'checking' ? 'checking' : 'online', // Assumption: if we can talk to the backend, it is online
    },
    {
      name: 'Hybrid Server',
      description: 'Java Processing Pipeline',
      icon: Database,
      status: status, // online, offline, checking, etc.
    }
  ];

  return (
    <Card className="col-span-1 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">System Health</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-md", 
                  service.status === 'online' ? "bg-emerald-500/10 text-emerald-500" :
                  service.status === 'checking' ? "bg-amber-500/10 text-amber-500 animate-pulse" :
                  "bg-destructive/10 text-destructive"
                )}>
                  <service.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground capitalize">
                  {service.status}
                </span>
                <span className={cn("relative flex h-2 w-2")}>
                  {service.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2",
                    service.status === 'online' ? "bg-emerald-500" :
                    service.status === 'checking' ? "bg-amber-500" :
                    "bg-destructive"
                  )}></span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
