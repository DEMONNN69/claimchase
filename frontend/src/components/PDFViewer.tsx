import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  AlertCircle,
  Maximize2,
} from "lucide-react";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

interface PDFViewerProps {
  url: string;
  fileName?: string;
  className?: string;
}

export default function PDFViewer({ url, fileName, className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error("PDF load error:", err);
    setLoading(false);
    setError("Failed to load PDF. The file may be corrupted or inaccessible.");
  }, []);

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);
  const resetView = () => {
    setScale(1.0);
    setRotation(0);
  };

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-slate-100 p-8", className)}>
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-slate-600 text-center mb-4">{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download PDF instead
        </a>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-slate-800", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="text-white hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm min-w-[80px] text-center">
            {pageNumber} / {numPages || "..."}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            className="text-white hover:bg-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="text-white hover:bg-slate-700"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="text-white hover:bg-slate-700"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Rotate */}
          <Button
            variant="ghost"
            size="sm"
            onClick={rotate}
            className="text-white hover:bg-slate-700 ml-2"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetView}
            className="text-white hover:bg-slate-700"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Download */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-blue-400 animate-spin mb-2" />
            <span className="text-slate-400">Loading PDF...</span>
          </div>
        )}
        
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            className="shadow-2xl"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Page Thumbnails (optional - for multi-page docs) */}
      {numPages && numPages > 1 && (
        <div className="bg-slate-900 border-t border-slate-700 p-2 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {Array.from({ length: Math.min(numPages, 10) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setPageNumber(page)}
                className={cn(
                  "w-8 h-8 rounded text-xs font-medium transition-colors",
                  pageNumber === page
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {page}
              </button>
            ))}
            {numPages > 10 && (
              <span className="text-slate-400 text-sm self-center">
                ... +{numPages - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
