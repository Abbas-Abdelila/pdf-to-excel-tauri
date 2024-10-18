import { Button } from "./ui/button";
import axios from "axios";
import { useEffect, useState } from "react";
import ExpandableAdvancedExtraction from "./ExpandableAdvancedExtraction";
import { FileTextIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SettingsProp = {
  extractionMethod: string;
  pageSelection: string;
  selectedPages: number | number[];
};

export default function Extract({
  fileName,
  fileOpen,
  totalPages, // Add totalPages prop
}: {
  fileName: string;
  fileOpen: boolean;
  totalPages: number; // Add totalPages prop type
}) {
  const [isConverted, setIsConverted] = useState(false);
  const [files, setFiles] = useState([]);
  const [settings, setSettings] = useState<SettingsProp>({
    extractionMethod: "",
    pageSelection: "",
    selectedPages: 99999999,
  });
  const [isLoading, setIsLoading] = useState(false); // Added state for loading

  const { toast } = useToast();

  const fetchExcelFiles = async (filename: string) => {
    try {
      const response = await axios.get(
        `http://localhost:8008/excel/${filename}`
      );
      setFiles(response.data.files);
    } catch (err) {
      console.log("Error fetching Excel files:", err);
      setFiles([]);
    }
  };

  useEffect(() => {
    if (!fileOpen) {
      setIsConverted(false);
      setFiles([]);
    }
  }, [fileOpen]);

  const handleExtraction = async () => {
    console.log("Uploading PDF file:", fileName);
    setIsLoading(true); // Set loading state to true
    try {
      // Step 1: Upload the PDF file
      let query: string = `http://localhost:8008/extract-tables?filename=${fileName}`;
      // const formData = new FormData();
      // const pdfFile = new File(
      //   [
      //     /* your PDF file data here */
      //   ],
      //   fileName
      // ); // Replace with actual PDF file data
      // formData.append("file", pdfFile);

      // const uploadResponse = await axios.post(
      //   `http://localhost:8008/upload-pdf`,
      //   formData,
      //   {
      //     headers: {
      //       "Content-Type": "multipart/form-data",
      //     },
      //   }
      // );

      // console.log(uploadResponse.data.message);
      if (settings.extractionMethod === "stream") {
        query += `&flavor=stream`;
      }

      if (settings.pageSelection === "single") {
        query += `&pages=${settings.selectedPages}`;
      } else if (settings.pageSelection === "multiple") {
        // Ensure the pages are formatted correctly for multiple selection
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

      // Step 2: Extract tables from the uploaded PDF
      const extractResponse = await axios.post(query, {});

      console.log(extractResponse.data.message);
      fetchExcelFiles(extractResponse.data.filename);
      setIsConverted(true);
    } catch (error) {
      console.error("Error during extraction:", error);
    } finally {
      setIsLoading(false); // Set loading state to false
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await axios.get(
        `http://localhost:8008/download/${filename}`,
        {
          responseType: "blob",
        }
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
        description: `Your file ${filename.split("_")[1]} has been saved to downloads folder.`,
      })
    } catch (error: any) {
      console.log("error loading file", error);
    }

  };

  return (
    <div className="flex flex-col items-center justify-center">
      <ExpandableAdvancedExtraction onSaveSettings={setSettings} totalPages={totalPages} /> {/* Pass totalPages */}
      {!isConverted && (
        <Button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full md:rounded-lg md:py-3 md:px-6 mt-4"
          onClick={handleExtraction}
          disabled={isLoading} // Disable button while loading
        >
          {isLoading ? (<div className="flex"><span>Extracting</span><Loader2 className="animate-spin ml-2" /></div>) : 'Extract table'}
        </Button>
      )}
      {isConverted && (
        <>
          <h3 className=" w-full text-center my-4 text-xl font-semibold text-gray-800 pb-2 border-b-2 border-slate-300 shadow-sm">Extraction Result</h3>
          <div className="flex flex-col gap-5 md:gap-8 mt-4">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-4">
                <Button
                  className="text-white font-bold py-2 px-8 rounded-full md:rounded-lg md:py-3 md:px-6 bg-blue-500 hover:bg-blue-700"
                  onClick={() => handleDownload(file)}
                >
                  <FileTextIcon className="w-6 h-6 text-white" /><span className="ml-2">Download Excel File {index + 1}</span>
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}