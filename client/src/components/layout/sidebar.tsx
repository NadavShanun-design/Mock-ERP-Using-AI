import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FileText,
  LogOut,
  Menu,
  Brain
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon, label, isActive, onClick }: NavItemProps) {
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className="w-full justify-start"
        onClick={onClick}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);

  const navigation = [
    { href: "/", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
    { href: "/inventory", icon: <Package className="h-5 w-5" />, label: "Inventory" },
    { href: "/sales", icon: <ShoppingCart className="h-5 w-5" />, label: "Sales" },
    { href: "/orders", icon: <FileText className="h-5 w-5" />, label: "Orders" },
    { href: "/consultant", icon: <Brain className="h-5 w-5" />, label: "AI Consultant" }
  ];

  const NavContent = () => (
    <div className="space-y-2">
      {navigation.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          isActive={location === item.href}
          onClick={() => setOpen(false)}
        />
      ))}
      <Button
        variant="ghost"
        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => logoutMutation.mutate()}
      >
        <LogOut className="h-5 w-5" />
        <span className="ml-2">Logout</span>
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="outline" size="icon" className="ml-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="py-4">
            <NavContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen w-64 flex-col border-r bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Shanun ERP</h1>
        </div>
        <div className="flex-1 px-4">
          <NavContent />
        </div>
      </div>
    </>
  );
}