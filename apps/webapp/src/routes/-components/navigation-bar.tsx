import * as React from "react";
import { Link } from "@tanstack/react-router";
import { MenuIcon, ExternalLinkIcon, LogInIcon, BookIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme";
import { authClient } from "@/lib/auth-client";
import { AccountDialog } from "@/components/auth/account-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WhatsappIcon, GithubIcon, type MergedIconComponent } from "@/components/icons";

interface NavigationItem {
  label: string;
  href: string;
  isExternal?: boolean;
  isDisabled?: boolean;
  hideLabel?: boolean;
  icon?: MergedIconComponent;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Documentation",
    href: "/docs",
    isDisabled: true,
    icon: BookIcon,
  },
  {
    label: "GitHub",
    href: "https://github.com/yan-vikng-dev/flowcost",
    isExternal: true,
    isDisabled: true,
    hideLabel: true,
    icon: GithubIcon,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/84906432245",
    isExternal: true,
    isDisabled: true,
    hideLabel: true,
    icon: WhatsappIcon,
  },
];

export function NavigationBar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { data: session } = authClient.useSession();

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
    });
  };

  const user = session?.user;
  const fallbackText = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-primary/5"
          : "bg-transparent",
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo and Brand */}
          <Link to="/">
            <div className="flex items-center gap-2">
              <img src="/logo/logo192.png" alt="Flowcost" className="size-12" />
              <span className="text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent hover:from-foreground hover:to-primary transition-all duration-300">
                Flowcost
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <div key={item.label} className="relative group">
                {item.isExternal ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-accent/50 group"
                  >
                    {!item.hideLabel && item.label}
                    {item.icon && <item.icon className="size-4" />}
                  </a>
                ) : (
                  <Link
                    to={item.href}
                    onClick={() => handleNavClick()}
                    className="flex items-center px-4 py-2 gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-accent/50"
                  >
                    {!item.hideLabel && item.label}
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.isExternal && <ExternalLinkIcon className="h-4 w-4" />}
                  </Link>
                )}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 group-hover:w-3/4" />
              </div>
            ))}

            {/* Theme Toggle */}
            <div className="ml-2 pl-2 border-l border-border/30">
              <ThemeToggle variant="ghost" align="end" />
            </div>
          </div>

          {/* Auth Button - Desktop */}
          <div className="hidden lg:block">
            {session ? (
              <AccountDialog>
                <Button variant="ghost" className="flex items-center gap-2 px-3">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {fallbackText}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user?.name || "Account"}</span>
                </Button>
              </AccountDialog>
            ) : (
              <Button onClick={() => void handleGoogleSignIn()} variant="default" className="gap-2">
                <LogInIcon className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button + Theme Toggle */}
          <div className="lg:hidden flex items-center space-x-2">
            <ThemeToggle variant="ghost" align="end" />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-10 w-10 hover:bg-accent/50"
                >
                  <MenuIcon className="h-5 w-5" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] bg-background/95 backdrop-blur-xl border-l border-border/50"
              >
                <SheetHeader className="text-left space-y-1 pb-6">
                  <SheetTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Navigation
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    Explore TanStack Start
                  </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col space-y-2 pb-6">
                  {navigationItems.map((item) => (
                    <div key={item.label} className="relative group">
                      {item.isExternal ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-accent/50"
                          onClick={() => setIsOpen(false)}
                        >
                          <span>{item.label}</span>
                          {item.icon && <item.icon className="h-4 w-4" />}
                          {item.isExternal && <ExternalLinkIcon className="h-4 w-4" />}
                        </a>
                      ) : (
                        <Link
                          to={item.href}
                          onClick={() => handleNavClick()}
                          className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-accent/50 text-left"
                        >
                          {item.label}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile Auth */}
                <div className="pt-4 border-t border-border/50">
                  {session ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {fallbackText}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user?.name || "User"}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => void handleGoogleSignIn()} variant="default" className="w-full gap-2">
                      <LogInIcon className="h-4 w-4" />
                      Sign In with Google
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
