import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function AiConsultant() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const consultMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/consultant/advice", {
        query: question,
        inventoryContext: stats
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to get AI advice");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Consultant Response",
        description: "New advice received",
      });
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
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Brain className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold">AI Consultant</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ask for Advice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ask about inventory optimization, seasonal trends, or stock management..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[100px]"
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
            Get Advice
          </Button>
        </CardContent>
      </Card>

      {consultMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap">
              {consultMutation.data.advice}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
