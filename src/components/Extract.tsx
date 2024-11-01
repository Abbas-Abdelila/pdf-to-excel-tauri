import { Button } from "./ui/button";
import axios from "axios";
import { useEffect, useState } from "react";
import ExpandableAdvancedExtraction from "./ExpandableAdvancedExtraction";
import { FileTextIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExtractionProgress } from "./ExtractionProgress";

// Internal types for Extract component
type SettingsProp = {
  extractionMethod: string;
  pageSelection: string;
  selectedPages: number | number[];
};

interface ExtractProps {
  fileName: string;
  fileOpen: boolean;
  totalPages: number;
}

interface ExcelFilesResponse {
  files: string[];
}

interface ExtractionResponse {
  filename: string;
  message: string;
  tablesURL: string;
  number_of_tables: number;
  success: boolean;
  excel_files: string[];
}

export default function Extract({
  fileName,
  fileOpen,
  totalPages,
}: ExtractProps) {
  // State management
  const [isConverted, setIsConverted] = useState<boolean>(false);
  const [files, setFiles] = useState<string[]>([]);
  const [settings, setSettings] = useState<SettingsProp>({
    extractionMethod: "",
    pageSelection: "",
    selectedPages: 99999999,
  });
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const { toast } = useToast();
  const [showProgress, setShowProgress] = useState<boolean>(false);

  // Fetch excel files after extraction
  const fetchExcelFiles = async (filename: string): Promise<void> => {
    try {
      const response = await axios.get<ExcelFilesResponse>(
        `http://localhost:8008/excel/${filename}`,
      );
      setFiles(response.data.files);
    } catch (err) {
      console.log("Error fetching Excel files:", err);
      setFiles([]);
    }
  };

  // Reset state when file is closed
  useEffect(() => {
    if (!fileOpen) {
      setIsConverted(false);
      setFiles([]);
    }
  }, [fileOpen]);

  // Handle extraction completion
  const handleExtractionComplete = (tableCount: number): void => {
    setIsConverted(true);
    toast({
      title: "Extraction Complete",
      description: `Successfully extracted ${tableCount} tables from the PDF.`,
    });
  };

  // Handle the extraction process
  const handleExtraction = async (): Promise<void> => {
    console.log("Uploading PDF file:", fileName);
    setIsExtracting(true);
    setShowProgress(true);
    setFiles([]);

    try {
      let query: string = `http://localhost:8008/extract-tables?filename=${fileName}`;

      // Add query parameters based on settings
      if (settings.extractionMethod === "stream") {
        query += `&flavor=stream`;
      }

      // Handle different page selection types
      if (settings.pageSelection === "single") {
        query += `&pages=${settings.selectedPages}`;
      } else if (settings.pageSelection === "multiple") {
        if (Array.isArray(settings.selectedPages)) {
          query += `&pages=${settings.selectedPages.join(",")}`;
        } else {
          query += `&pages=${settings.selectedPages}`;
        }
      } else if (settings.pageSelection === "range") {
        query += `&pages=${
          Array.isArray(settings.selectedPages)
            ? settings.selectedPages.join("-")
            : settings.selectedPages
        }`;
      }

      const extractResponse = await axios.post<ExtractionResponse>(query, {});
      console.log(extractResponse.data.message);

      await fetchExcelFiles(extractResponse.data.filename);
      setIsConverted(true);

      toast({
        title: "Extraction Complete",
        description: "Tables have been successfully extracted from the PDF.",
      });
    } catch (error) {
      console.error("Error during extraction:", error);
      toast({
        title: "Extraction Failed",
        description: "An error occurred while extracting tables.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
      }, 5000);
    }
  };

  // Handle file download
  const handleDownload = async (filename: string): Promise<void> => {
    try {
      const response = await axios.get(
        `http://localhost:8008/download/${filename}`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Download Complete!",
        description: `Your file ${
          filename.split("_")[1]
        } has been saved to downloads folder.`,
      });
    } catch (error) {
      console.log("error loading file", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the file.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setShowProgress(false);
    setIsConverted(false);
    setFiles([]);
  }, [settings, fileOpen]);

  return (
    <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
      {fileOpen && (
        <ExpandableAdvancedExtraction
          onSaveSettings={setSettings}
          setIsConverted={setIsConverted}
          totalPages={totalPages}
        />
      )}
      {!isConverted && fileOpen && (
        <Button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full md:rounded-lg md:py-3 md:px-6 mt-4"
          onClick={handleExtraction}
          disabled={isExtracting}
        >
          {isExtracting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              <span>Extracting Tables...</span>
            </div>
          ) : (
            "Extract Tables"
          )}
        </Button>
      )}
      {showProgress && (
        <ExtractionProgress
          isExtracting={isExtracting}
          selectedPages={
            settings.pageSelection === "all" ? "all" : settings.selectedPages
          }
          extractionMethod={settings.extractionMethod}
          onExtractionComplete={handleExtractionComplete}
        />
      )}

      {isConverted && fileOpen && (
        <>
          <h3 className="w-full text-center my-4 text-slate-700 text-xl font-semibold  pb-2 border-b-2 border-slate-300 shadow-sm">
            Extraction Complete!
          </h3>
          <div className="flex flex-col gap-5 md:gap-8 mt-4">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-4">
                <Button
                  className="text-white font-bold py-2 px-8 rounded-full md:rounded-lg md:py-3 md:px-6 bg-blue-500 hover:bg-blue-700"
                  onClick={() => handleDownload(file)}
                >
                  <FileTextIcon className="w-6 h-6 text-white" />
                  <span className="ml-2">Download Excel File {index + 1}</span>
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
