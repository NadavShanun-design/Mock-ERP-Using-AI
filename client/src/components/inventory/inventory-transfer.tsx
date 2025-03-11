import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryMovementSchema, Product, Location } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRightLeft, Loader2 } from "lucide-react";

interface TransferFormProps {
  onSuccess?: () => void;
  product?: Product;
}

export function InventoryTransfer({ onSuccess, product }: TransferFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const form = useForm({
    resolver: zodResolver(
      insertInventoryMovementSchema.extend({
        batchNumber: insertInventoryMovementSchema.shape.reference,
        expiryDate: insertInventoryMovementSchema.shape.timestamp.optional(),
      })
    ),
    defaultValues: {
      productId: product?.id,
      quantity: 0,
      type: "transfer",
      batchNumber: "",
      fromLocationId: undefined,
      toLocationId: undefined,
    },
  });

  const transferInventory = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory/transfer", {
        ...data,
        reference: data.batchNumber,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: "Success",
        description: "Inventory transferred successfully",
      });
      form.reset();
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transfer Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Inventory</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => transferInventory.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="fromLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Location</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations?.map((location) => (
                        <SelectItem
                          key={location.id}
                          value={location.id.toString()}
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Location</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations?.map((location) => (
                        <SelectItem
                          key={location.id}
                          value={location.id.toString()}
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={transferInventory.isPending}
            >
              {transferInventory.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Transfer Stock
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
