import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package2, ShoppingCart, AlertCircle, DollarSign } from "lucide-react";

interface StatsProps {
  stats: {
    totalProducts: number;
    totalOrders: number;
    lowStockProducts: number;
    totalRevenue: number;
  };
}

export default function StatsCards({ stats }: StatsProps) {
  const cards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: <Package2 className="h-5 w-5 text-blue-500" />,
      description: "Products in inventory",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: <ShoppingCart className="h-5 w-5 text-green-500" />,
      description: "Orders processed",
    },
    {
      title: "Low Stock",
      value: stats.lowStockProducts,
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      description: "Products need restock",
    },
    {
      title: "Revenue",
      value: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(stats.totalRevenue),
      icon: <DollarSign className="h-5 w-5 text-yellow-500" />,
      description: "Total revenue",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
