import { Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPWAButton() {
  const { isInstallable, handleInstall } = usePWAInstall();
  
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Don't show if already installed as PWA
  if (isStandalone) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            ✅ App is already installed on your device!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show install button for browsers that support it (Chrome, Edge, etc.)
  if (isInstallable) {
    return (
      <Button onClick={handleInstall} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Install to Home Screen
      </Button>
    );
  }

  // Show iOS-specific instructions
  if (isIOS) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Install on iPhone/iPad:</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">1</span>
                <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">2</span>
                <span>Scroll down and tap <Plus className="inline h-4 w-4 mx-1" /> "Add to Home Screen"</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">3</span>
                <span>Tap "Add" to install the app</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For other browsers, show generic message
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          To install this app, use a supported browser like Chrome or Safari on iOS.
        </p>
      </CardContent>
    </Card>
  );
}