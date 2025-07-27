import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPWAButton() {
  const { isInstallable, handleInstall } = usePWAInstall();

  if (!isInstallable) {
    return null;
  }

  return (
    <div className="p-4 border-t">
      <h3 className="text-lg font-medium mb-2">Install App</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Install CAT-a-log on your device for a better experience, including offline access and faster loading.
      </p>
      <Button onClick={handleInstall} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Install to Home Screen
      </Button>
    </div>
  );
}