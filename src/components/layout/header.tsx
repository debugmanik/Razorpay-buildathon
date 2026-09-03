
import { getProviderConfig } from '@/services/providers/config';
import { ResetDemoButton } from '@/components/layout/ResetDemoButton';
import { GlobalSearch } from './header/GlobalSearch';
import { NotificationBell } from './header/NotificationBell';
import { UserMenu } from './header/UserMenu';

export function Header() {
  const providerConfig = getProviderConfig();
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10 w-full overflow-visible">
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-1">
        <GlobalSearch />
      </div>
      
      <div className="flex items-center gap-4">
        {providerConfig.isSimulation && <ResetDemoButton />}
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
