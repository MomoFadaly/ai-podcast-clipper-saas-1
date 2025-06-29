import { pdfjs } from 'react-pdf';

// Configure PDF.js worker with local file only
if (typeof window !== 'undefined') {
  // Use local worker file
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  
  // Enable some performance optimizations
  pdfjs.GlobalWorkerOptions.workerPort = null;
}

export { pdfjs };