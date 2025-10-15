import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AccountDialog } from "@/components/auth/account-dialog";
import { BellIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";


export function Header() {
  const { data: session } = authClient.useSession();
  
  const user = session?.user;
  const fallbackText = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      {/* Left side - Logo */}
      <div className="flex items-center gap-2">
        <Link to="/app">
          <img src="/logo/logo192.png" alt="Flowcost" className="size-12" />
        </Link>
      </div>

      {/* Right side - Settings, Notifications and user menu */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link to="/app/settings/preferences">Settings</Link>
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {/* <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></span> */}
        </Button>

        <AccountDialog>
          <Button variant="ghost" className="flex items-center gap-2 px-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {fallbackText}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium">{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </Button>
        </AccountDialog>
      </div>
    </header>
  );
}