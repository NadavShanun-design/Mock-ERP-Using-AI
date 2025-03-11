import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { Product, Location, ProductInventory } from "@shared/schema";
import { ProductForm } from "@/components/inventory/product-form";
import { LocationManager } from "@/components/inventory/location-manager";
import { InventoryTransfer } from "@/components/inventory/inventory-transfer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: inventory } = useQuery<ProductInventory[]>({
    queryKey: ["/api/inventory"],
  });

  const filteredProducts = products?.filter(product => 
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.sku.toLowerCase().includes(search.toLowerCase()) ||
    product.description?.toLowerCase().includes(search.toLowerCase())
  );

  function getProductStock(productId: number) {
    return inventory
      ?.filter(inv => inv.productId === productId)
      .reduce((sum, inv) => sum + (inv.quantity - (inv.reservedQuantity || 0)), 0) ?? 0;
  }

  function getStockStatus(product: Product) {
    const totalStock = getProductStock(product.id);
    const reorderPoint = product.reorderPoint || 10;

    if (totalStock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (totalStock <= reorderPoint) {
      return <Badge variant="warning" className="bg-yellow-500/10 text-yellow-500">Low Stock</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-500/10 text-green-500">In Stock</Badge>;
    }
  }

  if (productsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Inventory Management</h1>
              <p className="text-muted-foreground">
                Manage your products and stock levels across locations
              </p>
            </div>
            <ProductForm />
          </div>

          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Available Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts?.map((product) => {
                      const totalStock = getProductStock(product.id);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.sku}</TableCell>
                          <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                          <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                          <TableCell>{totalStock}</TableCell>
                          <TableCell>{getStockStatus(product)}</TableCell>
                          <TableCell>
                            <InventoryTransfer product={product} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredProducts?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="locations">
              <LocationManager />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}