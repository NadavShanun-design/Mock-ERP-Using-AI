import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Brain, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";

export default function ConsultantPage() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  // Get data for context
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Handle AI consultation
  const consultMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/consultant/advice", {
        query: question
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to get AI advice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Received AI recommendations",
      });
      // Clear the input after successful submission
      setQuery("");
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
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Inventory Consultant</h1>
            <p className="text-muted-foreground">
              Get expert advice on inventory management and optimization
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ask for Advice</CardTitle>
              <CardDescription>
                Ask about inventory optimization, seasonal trends, stock management, 
                order fulfillment, or any other business operations questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: How can I optimize my inventory levels across different locations? 
                  What seasonal trends should I prepare for?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[150px]"
              />
              <Button 
                className="w-full"
                onClick={() => consultMutation.mutate(query)}
                disabled={consultMutation.isPending || !query.trim()}
              >
                {consultMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Get Expert Advice
              </Button>
            </CardContent>
          </Card>

          {consultMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">
                    {consultMutation.data.advice}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}