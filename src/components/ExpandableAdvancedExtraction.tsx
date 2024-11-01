'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import AdvancedExtraction from './AdvancedExtraction'

type FormData = {
  extractionMethod: string;
  pageSelection: string;
  selectedPages: number | number[];
}

type ExpandableAdvancedSettingsProps = {
  onSaveSettings: (settings: FormData) => void;
  totalPages: number;
  setIsConverted: (isConverted: boolean) => void;
}

export default function ExpandableAdvancedSettings({ onSaveSettings, setIsConverted, totalPages }: ExpandableAdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full my-10 space-y-2 border rounded-lg shadow-lg p-4"
    >
      <div className="flex items-center justify-between space-x-4 px-4 cursor-pointer"
      onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="text-sm font-semibold">
          Advanced Settings
        </h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="lg" className="w-12 p-0">
            {isOpen ? (
              <ChevronUp className="h-8 w-8" />
            ) : (
              <ChevronDown className="h-8 w-8" />
            )}
            <span className="sr-only">Toggle Advanced Settings</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-3 font-mono text-sm">
          <AdvancedExtraction onSaveSettings={onSaveSettings} setIsConverted={setIsConverted} totalPages={totalPages} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}