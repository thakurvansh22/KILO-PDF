import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { MergePage } from './pages/MergePage';
import { SplitPage } from './pages/SplitPage';
import { RotatePage } from './pages/RotatePage';
import { DeletePage } from './pages/DeletePage';
import { ReorderPage } from './pages/ReorderPage';
import { PdfToImagesPage } from './pages/PdfToImagesPage';
import { ImagesToPdfPage } from './pages/ImagesToPdfPage';
import { PdfToTextPage } from './pages/PdfToTextPage';
import { EditPdfPage } from './pages/EditPdfPage';
import { WatermarkPage } from './pages/WatermarkPage';
import { PageNumbersPage } from './pages/PageNumbersPage';
import { OcrPage } from './pages/OcrPage';
import { CompressPage } from './pages/CompressPage';
import { PdfToWordPage } from './pages/PdfToWordPage';
import { ProtectPdfPage } from './pages/ProtectPdfPage';
import { UnlockPdfPage } from './pages/UnlockPdfPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { BlogPage } from './pages/BlogPage';
import { BlogArticlePage } from './pages/BlogArticlePage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/protect-pdf" element={<ProtectPdfPage />} />
              <Route path="/protect" element={<Navigate to="/protect-pdf" replace />} />
              <Route path="/unlock-pdf" element={<UnlockPdfPage />} />
              <Route path="/unlock" element={<Navigate to="/unlock-pdf" replace />} />
              <Route path="/edit-pdf" element={<EditPdfPage />} />
              <Route path="/watermark" element={<WatermarkPage />} />
              <Route path="/page-numbers" element={<PageNumbersPage />} />
              <Route path="/ocr" element={<OcrPage />} />
              <Route path="/compress" element={<CompressPage />} />
              <Route path="/pdf-to-word" element={<PdfToWordPage />} />
              <Route path="/merge" element={<MergePage />} />
              <Route path="/split" element={<SplitPage />} />
              <Route path="/rotate" element={<RotatePage />} />
              <Route path="/delete" element={<DeletePage />} />
              <Route path="/reorder" element={<ReorderPage />} />
              <Route path="/pdf-to-images" element={<PdfToImagesPage />} />
              <Route path="/images-to-pdf" element={<ImagesToPdfPage />} />
              <Route path="/pdf-to-text" element={<PdfToTextPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogArticlePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
