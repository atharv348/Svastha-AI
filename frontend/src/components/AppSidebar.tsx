import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Brain,
  MessageCircle,
  MapPin,
  Settings,
  Activity,
  LogOut,
  Accessibility,
  Zap,
  Swords,
  Quote,
  Heart,
  Hospital,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Hub", url: "/coach", icon: MessageCircle },
];

const specializedItems = [
  { title: "AI Diagnosis", url: "/diagnosis", icon: Brain },
  { title: "ManasMitra", url: "/manasmitra", icon: Zap },
  { title: "SahayakAI", url: "/sahayak", icon: Accessibility },
];

const secondaryItems = [
  { title: "SvasthaQuest & Achievements", url: "/svasthaquest", icon: Swords },
  { title: "MediRush Game", url: "/medirush", icon: Hospital },
  { title: "Find Hospital", url: "/hospitals", icon: MapPin },
  { title: "Activity Log", url: "/activity", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
];

const sidebarQuotes = [
  { text: "The greatest wealth is health.", author: "Virgil" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Health is not valued till sickness comes.", author: "Thomas Fuller" },
  { text: "A healthy outside starts from the inside.", author: "Robert Urich" },
  { text: "Your body hears everything your mind says.", author: "Naomi Judd" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    if (collapsed) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % sidebarQuotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [collapsed]);

  const activeQuote = sidebarQuotes[quoteIndex];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/80 border border-border/40 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/10">
            <img
              src="/svasthaai-logo.svg"
              alt="SvasthaAI logo"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground leading-none">SvasthaAI</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-medium">Health Intelligence</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">AI Intelligence Suite</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1">
              {specializedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-secondary/80 group" 
                      activeClassName="bg-secondary text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Main Services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"} 
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-secondary/80 group" 
                      activeClassName="bg-secondary text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Health Management</SidebarGroupLabel>
           <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-1">
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-secondary/80 group" 
                      activeClassName="bg-secondary text-primary font-semibold shadow-sm"
                    >
                      <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-all group"
            >
              <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="mt-4 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Pro Tip</p>
            <Quote className="h-4 w-4 text-primary/55 mt-1.5 mb-2" />
            <p className="text-xs font-medium italic text-foreground leading-relaxed">"{activeQuote.text}"</p>
            <p className="text-[11px] text-muted-foreground mt-2">- {activeQuote.author}</p>
            <div className="flex gap-1 mt-2">
              {sidebarQuotes.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === quoteIndex ? "w-5 bg-primary" : "w-1.5 bg-primary/30"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
