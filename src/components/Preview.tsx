import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FileSpreadsheet, ChevronDown, Loader2 } from "lucide-react"

export default function Preview() {
  const [selectedPages, setSelectedPages] = useState<string[]>(['all'])
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [results, setResults] = useState<string[]>([])

  const totalPages = 10 // This should be dynamically set based on the actual PDF

  const handlePageSelect = (page: string) => {
    setSelectedPages(prev => {
      if (page === 'all') {
        return ['all']
      } else if (prev.includes('all')) {
        return [page]
      } else if (prev.includes(page)) {
        return prev.filter(p => p !== page)
      } else {
        return [...prev, page]
      }
    })
  }

  const handleExtract = () => {
    setIsExtracting(true)
    setProgress(0)
    setLogs([])
    setResults([])

    // Simulating extraction process
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExtracting(false)
          setResults(['pdf-file-table-1.xlsx', 'pdf-file-table-2.xlsx', 'pdf-file-table-3.xlsx'])
          return 100
        }
        setLogs(prevLogs => [...prevLogs, `Extracting table ${prev + 10}%...`])
        return prev + 10
      })
    }, 500)
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>PDF Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted h-96 flex items-center justify-center text-muted-foreground">
              PDF will be rendered here
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tables to extract</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedPages.includes('all') ? 'All pages' : `${selectedPages.length} page(s) selected`}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search pages..." />
                  <CommandEmpty>No pages found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-72">
                      <CommandItem onSelect={() => handlePageSelect('all')}>
                        <Checkbox
                          checked={selectedPages.includes('all')}
                          onCheckedChange={() => handlePageSelect('all')}
                          className="mr-2"
                        />
                        <span>All pages</span>
                      </CommandItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <CommandItem key={page} onSelect={() => handlePageSelect(page.toString())}>
                          <Checkbox
                            checked={selectedPages.includes(page.toString()) || selectedPages.includes('all')}
                            onCheckedChange={() => handlePageSelect(page.toString())}
                            className="mr-2"
                          />
                          <span>Page {page}</span>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <Button onClick={handleExtract} disabled={isExtracting} className="w-full">
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                'Extract'
              )}
            </Button>
            {isExtracting && (
              <Card>
                <CardContent className="pt-6">
                  <Progress value={progress} className="w-full" />
                  <ScrollArea className="h-24 mt-2">
                    {logs.map((log, index) => (
                      <p key={index} className="text-sm text-muted-foreground">{log}</p>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.map((result, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-500" />
                  <span>{result}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}