import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { parseFacebookCSV, validateFacebookCSVHeaders, convertToCPAChartData, type ParsedFacebookData } from '@/utils/facebookCSVParser'
import { CPAAreaChart, type CPAData } from '@/components/CPAAreaChart'
import { Upload, FileText, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'

interface FacebookCSVUploadProps {
  onDataParsed?: (data: CPAData[]) => void
}

export function FacebookCSVUpload({ onDataParsed }: FacebookCSVUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedFacebookData | null>(null)
  const [chartData, setChartData] = useState<CPAData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.')
      return
    }

    setFile(selectedFile)
    setIsProcessing(true)
    setParsedData(null)
    setChartData([])

    try {
      const result = await parseFacebookCSV(selectedFile)
      setParsedData(result)

      if (result.success && result.data.length > 0) {
        const chartData = convertToCPAChartData(result.data)
        setChartData(chartData)
        onDataParsed?.(chartData)
      }
    } catch (error) {
      console.error('Error processing file:', error)
      setParsedData({
        success: false,
        data: [],
        errors: [`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        summary: {
          totalRows: 0,
          validRows: 0,
          totalSpend: 0,
          totalConversions: 0,
          averageCPA: 0,
          dateRange: { start: '', end: '' }
        }
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setParsedData(null)
    setChartData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Facebook Ads CSV
          </CardTitle>
          <CardDescription>
            Upload CSV files exported from Facebook Ads Manager to track CPA performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📊 How to Export Facebook Ads Data</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to Facebook Ads Manager</li>
              <li>Click "Ad Sets" tab and set date range</li>
              <li>Sort by "Amount Spent" (descending)</li>
              <li>Click "Export" → "Export Table Data" → "CSV"</li>
              <li>Ensure columns: Ad Set Name, Amount Spent, Results, Cost per Result</li>
            </ol>
          </div>

          {/* Upload Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            
            <div className="space-y-4">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {file ? file.name : 'Drop your Facebook CSV file here'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse (max 10MB)
                </p>
              </div>
              
              {file && (
                <div className="flex items-center justify-center gap-4">
                  <span className="text-sm text-gray-600">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeFile}
                    disabled={isProcessing}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isProcessing && (
            <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Processing CSV file...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {parsedData.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parsedData.success ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {parsedData.summary.validRows}
                    </div>
                    <div className="text-sm text-gray-500">Ad Sets Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ${parsedData.summary.totalSpend.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Total Spend</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {parsedData.summary.totalConversions.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500">Total Conversions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ${parsedData.summary.averageCPA.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Average CPA</div>
                  </div>
                </div>

                {/* Date Range */}
                {parsedData.summary.dateRange.start && (
                  <div className="text-sm text-gray-600 text-center">
                    Data range: {parsedData.summary.dateRange.start} to {parsedData.summary.dateRange.end}
                  </div>
                )}

                {/* Warnings */}
                {parsedData.errors.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">
                      ⚠️ Warnings ({parsedData.errors.length})
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                      {parsedData.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {parsedData.errors.length > 5 && (
                        <li>• ... and {parsedData.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">❌ Processing Failed</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {parsedData.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <CPAAreaChart 
          data={chartData}
          title="Facebook Ads - Cost Per Acquisition Analysis"
          description="Daily CPA vs 7-day rolling average from uploaded data"
        />
      )}
    </div>
  )
}

export default FacebookCSVUpload