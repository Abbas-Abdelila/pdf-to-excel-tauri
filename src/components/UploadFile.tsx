import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { EmbedPDF } from "@simplepdf/react-embed-pdf";

export default function UploadFile({ setFileName, setFileOpen, setTotalPages }: { setFileName: (fileName: string) => void, setFileOpen: (fileOpen: boolean) => void, setTotalPages: (totalPages: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    filename: string;
    message: string;
    documentURL: string;
  } | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf", ".PDF"] },
    multiple: false,
  });

  const handleUpload = async () => {
    setLoading(true);
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://localhost:8008/upload-pdf",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const { loaded, total } = progressEvent;
            if (total) {
              const percent = Math.floor((loaded * 100) / total);
              setUploadProgress(percent);
            }
          },
        }
      );

      if (response.status === 200) {
        setResponse({
          filename: response.data.filename,
          message: response.data.message,
          documentURL: response.data.documentURL,
        });
        setFileName(response.data.filename);

        // Calculate total pages (assuming the response contains total pages)
        const totalPages = response.data.totalPages; // Adjust this based on your API response
        setTotalPages(totalPages);
        setLoading(false);
      } else {
        setLoading(false);
        alert("Failed to upload file. Please try again.");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setResponse(null);
    setUploadProgress(0);
    setFileOpen(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mt-8 sm:mt-12 md:mt-16 lg:mt-24">
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="flex flex-col gap-4 sm:gap-6 md:gap-8 p-4 sm:p-6 md:p-8">
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer transition-colors hover:border-gray-400 p-4 sm:p-8 md:p-12"
          >
            <Input {...getInputProps()} />
            <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
            <p className="mt-2 text-xs sm:text-sm md:text-base text-gray-600">
              {isDragActive
                ? "Drop the PDF file here"
                : "Click here to upload a PDF file"}
            </p>
          </div>
          {file && (
            <div className="mt-2 sm:mt-3 md:mt-4 space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <File className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  <span className="text-xs sm:text-sm truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile} className="flex-shrink-0">
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button className="mt-2 sm:mt-3 md:mt-4" disabled={!file} onClick={handleUpload}>
            {loading ? <Loader2 className="animate-spin" /> : "Upload"}
          </Button>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress value={uploadProgress} className="mt-2 sm:mt-3 md:mt-4" />
          )}
        </CardContent>
      </Card>

      {response && (
        <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 mt-8 sm:mt-12 md:mt-16 items-center justify-center">
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 text-center">
            PDF Preview
          </p>
          <div className="w-full max-w-4xl mx-auto h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]">
            <EmbedPDF
              mode="inline"
              style={{ width: "100%", height: "100%" }}
              documentURL={response.documentURL}
            />
          </div>
        </div>
      )}
    </div>
  );
}
