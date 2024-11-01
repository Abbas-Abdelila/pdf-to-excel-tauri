import { useEffect, useState, useCallback } from "react";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useRef } from "react";
// Internal types for ExtractionProgress component
interface ProgressMessage {
  type: "progress" | "completion" | "error" | "keepalive";
  message: string;
  percentage: number;
  processed: number;
  total: number;
  timestamp: string;
  tables?: number;
  extractionComplete?: boolean;
}

interface ExtractionProgressProps {
  isExtracting: boolean;
  selectedPages?: string | number | number[];
  extractionMethod?: string;
  onExtractionComplete?: (tableCount: number) => void;
}

export function ExtractionProgress({
  isExtracting,
  onExtractionComplete,
}: ExtractionProgressProps) {
  // State management
  const [messages, setMessages] = useState<ProgressMessage[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [processedPages, setProcessedPages] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Add this useEffect to handle auto-scrolling
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.lastElementChild?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Handle incoming server messages
  const handleServerMessage = useCallback(
    (data: ProgressMessage) => {
      console.log("Received progress update:", data);

      // Update messages list while preventing duplicates
      setMessages((prev) => {
        if (prev.some((msg) => msg.timestamp === data.timestamp)) {
          return prev;
        }
        // Keep last 50 messages for performance
        return [...prev.slice(-50), data];
      });

      // Update progress metrics
      setProgress(Math.round(data.percentage || 0));
      setProcessedPages(data.processed || 0);
      setTotalPages(data.total || 0);

      // Handle different message types
      switch (data.type) {
        case "completion":
          setIsComplete(true);
          if (onExtractionComplete && data.tables !== undefined) {
            onExtractionComplete(data.tables);
          }
          break;
        case "error":
          setError(data.message);
          break;
        case "progress":
          // Regular progress update handling
          break;
      }
    },
    [onExtractionComplete],
  );

  // Set up and manage SSE connection
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (isExtracting) {
      // Reset error state but maintain other states
      setError(null);

      // Create new EventSource connection
      eventSource = new EventSource(
        "http://localhost:8008/extraction-progress",
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "keepalive") return;
          handleServerMessage(data as ProgressMessage);
        } catch (err) {
          console.error("Error parsing SSE message:", err);
          setError("Error processing server update");
        }
      };

      eventSource.onerror = () => {
        console.error("EventSource failed");
        setError("Connection to server failed");
        if (eventSource) {
          eventSource.close();
        }
      };
    }

    return () => {
      if (eventSource) {
        console.log("Closing SSE connection");
        eventSource.close();
      }
    };
  }, [isExtracting, handleServerMessage]);

  // Helper functions for UI elements
  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (isComplete) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (isExtracting)
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    return <Info className="h-5 w-5 text-gray-400" />;
  };

  const getStatusMessage = () => {
    if (error) return "Extraction Failed";
    if (isComplete) return "Extraction Complete";
    if (isExtracting) return "Extracting...";
    return "Waiting to Start";
  };

  const getMessageBackgroundColor = (type: ProgressMessage["type"]) => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-100";
      case "completion":
        return "bg-green-50 border-green-100";
      case "progress":
        return "bg-white border-gray-100";
      default:
        return "bg-gray-50 border-gray-100";
    }
  };

  return (
    <Card className="w-full mt-4 shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium text-base">{getStatusMessage()}</span>
          </div>
          <div className="text-sm font-normal text-gray-600">
            {processedPages > 0 && (
              <span>
                {processedPages} of {totalPages} pages processed
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Progress bar */}
        <div className="flex items-center justify-between">
          <Progress
            value={progress}
            className={`h-2 ${
              error ? "bg-red-100" : isComplete ? "bg-green-100" : "bg-blue-100"
            }`}
          />
          <span className="px-4 text-sm text-gray-600">{progress}%</span>
        </div>

        {/* Messages scroll area */}
        <ScrollArea className="h-[200px] w-full rounded-md border bg-gray-50 p-4">
          <div ref={scrollAreaRef} className="space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={`${msg.timestamp}-${idx}`}
                className={`text-sm py-2 px-3 rounded-lg border ${getMessageBackgroundColor(
                  msg.type,
                )}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      msg.type === "error"
                        ? "text-red-700"
                        : msg.type === "completion"
                          ? "text-green-700"
                          : "text-gray-700"
                    }`}
                  >
                    {msg.message}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {msg.processed !== undefined && msg.total !== undefined && (
                  <div className="text-xs mt-1 text-gray-500">
                    Progress: {msg.processed}/{msg.total}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
