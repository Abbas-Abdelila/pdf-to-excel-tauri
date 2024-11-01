"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// const TOTAL_PAGES = 100
let PAGES_PER_VIEW = 20;

type FormData = {
  extractionMethod: string;
  pageSelection: string;
  selectedPages: number | number[];
};

type AdvancedExtractionProps = {
  onSaveSettings: (settings: FormData) => void;
  setIsConverted: (isConverted: boolean) => void;
  totalPages: number;
};

const SinglePageSelection = ({
  onPageChange,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  totalPages: number;
}) => (
  <div className="space-y-2 md:space-y-4">
    <Label htmlFor="singlePage" className="text-sm md:text-base">
      Enter Page Number
    </Label>
    <Input
      id="singlePage"
      type="number"
      min={1}
      max={totalPages}
      onChange={(e) => onPageChange(Number(e.target.value))}
      placeholder={`1 - ${totalPages}`}
      className="w-full md:w-1/2"
    />
  </div>
);

const MultiplePageSelection = ({
  selectedPages,
  onPageToggle,
  totalPages,
}: {
  selectedPages: number[];
  onPageToggle: (page: number) => void;
  totalPages: number;
}) => {
  const [startPage, setStartPage] = useState(1);

  const handlePrevious = () =>
    setStartPage((prev) => Math.max(prev - PAGES_PER_VIEW, 1));
  const handleNext = () =>
    setStartPage((prev) =>
      Math.min(prev + PAGES_PER_VIEW, totalPages - PAGES_PER_VIEW + 1),
    );

  const pageCheckboxes = Array.from(
    { length: PAGES_PER_VIEW },
    (_, i) => startPage + i,
  ).map((page) => (
    <div key={page} className="flex items-center space-x-2 md:space-x-4">
      <Label htmlFor={`page-${page}`} className="text-sm md:text-base">
        {page}
      </Label>
      <Checkbox
        id={`page-${page}`}
        checked={selectedPages.includes(page)}
        onCheckedChange={() => onPageToggle(page)}
        className="md:mr-4"
      />
    </div>
  ));

  return (
    <div className="space-y-4 md:space-y-6">
      <Label className="text-sm md:text-base">Select Multiple Pages</Label>
      <div className="grid grid-cols-5 gap-2 md:grid-cols-10 md:gap-4">
        {pageCheckboxes}
      </div>
      <div className="flex justify-between items-center md:space-x-4">
        <Button
          onClick={handlePrevious}
          disabled={startPage === 1}
          className="md:mr-4"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={startPage + PAGES_PER_VIEW > totalPages}
          className="md:ml-4"
        >
          Next
        </Button>
      </div>
      <div className="mt-2">
        <Label className="text-sm md:text-base">
          Selected Pages: {selectedPages.sort((a, b) => a - b).join(", ")}
        </Label>
      </div>
    </div>
  );
};

const PageRangeSelection = ({
  onRangeChange,
  totalPages,
}: {
  onRangeChange: (start: number, end: number) => void;
  totalPages: number;
}) => (
  <div className="flex space-x-4 md:space-x-8">
    <div className="flex-1 space-y-2 md:space-y-4">
      <Label htmlFor="rangeStart" className="text-sm md:text-base">
        Start Page
      </Label>
      <Input
        id="rangeStart"
        type="number"
        min={1}
        max={totalPages}
        onChange={(e) => onRangeChange(Number(e.target.value), -1)}
        placeholder="1"
        className="w-full md:w-1/2"
      />
    </div>
    <div className="flex-1 space-y-2 md:space-y-4">
      <Label htmlFor="rangeEnd" className="text-sm md:text-base">
        End Page
      </Label>
      <Input
        id="rangeEnd"
        type="number"
        min={1}
        max={totalPages}
        onChange={(e) => onRangeChange(-1, Number(e.target.value))}
        placeholder={totalPages.toString()}
        className="w-full md:w-1/2"
      />
    </div>
  </div>
);

export default function AdvancedExtraction({
  onSaveSettings,
  setIsConverted,
  totalPages,
}: AdvancedExtractionProps) {
  const [formData, setFormData] = useState<FormData>({
    extractionMethod: "lattice",
    pageSelection: "single",
    selectedPages: 1,
  });

  PAGES_PER_VIEW = Math.min(PAGES_PER_VIEW, totalPages);

  const { toast } = useToast();

  const handleSinglePageChange = (page: number) => {
    setFormData((prev) => ({ ...prev, selectedPages: page }));
  };

  const handleMultiplePageToggle = (page: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedPages: Array.isArray(prev.selectedPages)
        ? prev.selectedPages.includes(page)
          ? prev.selectedPages.filter((p) => p !== page)
          : [...prev.selectedPages, page]
        : [page],
    }));
  };

  const handleRangeChange = (start: number, end: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedPages: [
        start !== -1
          ? start
          : Array.isArray(prev.selectedPages)
            ? prev.selectedPages[0]
            : 1,
        end !== -1
          ? end
          : Array.isArray(prev.selectedPages)
            ? prev.selectedPages[1]
            : totalPages,
      ],
    }));
  };

  const handleSaveSettings = () => {
    onSaveSettings(formData);
    toast({
      title: "Settings Saved",
      description: "Your extraction settings have been saved",
      variant: "default",
      duration: 5000,
    });
    setIsConverted(false);
  };

  return (
    <Card className="w-full max-w-2xl md:max-w-4xl lg:max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Advanced Extraction</CardTitle>
        <CardDescription>
          Configure your PDF extraction settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 md:space-y-8">
        <div className="space-y-2 md:space-y-4">
          <Label className="text-sm md:text-base">Extraction Method</Label>
          <RadioGroup
            value={formData.extractionMethod}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, extractionMethod: value }))
            }
          >
            <div className="flex items-center space-x-2 md:space-x-4">
              <RadioGroupItem value="lattice" id="lattice" />
              <Label htmlFor="lattice" className="text-sm md:text-base">
                Lattice{" "}
                <span className="text-sm font-extralight text-gray-500">
                  (use for table separated by lines)(default)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <RadioGroupItem value="stream" id="stream" />
              <Label htmlFor="stream" className="text-sm md:text-base">
                Stream{" "}
                <span className="text-sm font-extralight text-gray-500">
                  (use for table separated by spaces)
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2 md:space-y-4">
          <Label className="text-sm md:text-base">Page Selection</Label>
          <Select
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                pageSelection: value,
                selectedPages:
                  value === "single"
                    ? 1
                    : value === "multiple"
                      ? []
                      : [1, totalPages],
              }))
            }
            value={formData.pageSelection}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select page input method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single Page</SelectItem>
              <SelectItem value="multiple">Multiple Pages</SelectItem>
              <SelectItem value="range">Page Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.pageSelection === "single" && (
          <SinglePageSelection
            onPageChange={handleSinglePageChange}
            totalPages={totalPages}
          />
        )}

        {formData.pageSelection === "multiple" && (
          <MultiplePageSelection
            selectedPages={
              Array.isArray(formData.selectedPages)
                ? formData.selectedPages
                : []
            }
            onPageToggle={handleMultiplePageToggle}
            totalPages={totalPages}
          />
        )}

        {formData.pageSelection === "range" && (
          <PageRangeSelection
            onRangeChange={handleRangeChange}
            totalPages={totalPages}
          />
        )}

        <div>
          <Button onClick={handleSaveSettings} className="mt-4 md:mt-6">
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
