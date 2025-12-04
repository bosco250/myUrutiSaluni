'use client';

import { useState } from 'react';
import Accordion from '@/components/ui/Accordion';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';

interface DocumentFile {
  id: string;
  name: string;
  status: 'uploaded' | 'uploading' | 'pending' | 'error';
  progress?: number;
  errorMessage?: string;
}

export default function DocumentUploadPage() {
  const [documents, setDocuments] = useState<DocumentFile[]>([
    {
      id: '1',
      name: 'business-license-2023.pdf',
      status: 'uploaded',
    },
    {
      id: '2',
      name: 'drivers-license-front.jpg',
      status: 'uploading',
      progress: 68,
    },
    {
      id: '3',
      name: '',
      status: 'pending',
    },
    {
      id: '4',
      name: '',
      status: 'error',
      errorMessage: 'The image provided was blurry. Please upload a clear photo of a recent utility bill.',
    },
  ]);

  const handleDelete = (id: string) => {
    setDocuments(docs => docs.filter(doc => doc.id !== id));
  };

  const handleUpload = (id: string, type: 'camera' | 'library') => {
    // Simulate file upload
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setDocuments(docs =>
        docs.map(d =>
          d.id === id
            ? { ...d, status: 'uploading', progress: 0, name: 'uploading-file.pdf' }
            : d
        )
      );

      // Simulate progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setDocuments(docs =>
          docs.map(d =>
            d.id === id ? { ...d, progress } : d
          )
        );

        if (progress >= 100) {
          clearInterval(interval);
          setDocuments(docs =>
            docs.map(d =>
              d.id === id ? { ...d, status: 'uploaded', progress: 100 } : d
            )
          );
        }
      }, 200);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden antialiased">
      {/* Header */}
      <div className="flex items-center bg-surface-dark dark:bg-surface-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-border-dark dark:border-border-dark">
        <div className="flex size-10 shrink-0 items-center justify-start text-text-dark dark:text-text-dark">
          <button onClick={() => window.history.back()}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <h1 className="text-text-dark dark:text-text-dark text-lg font-bold leading-tight tracking-tight flex-1 text-center">
          Document Verification
        </h1>
        <div className="flex w-10 items-center justify-end">
          <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-transparent text-text-dark dark:text-text-dark gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-5 pb-28">
        <h2 className="text-text-dark dark:text-text-dark tracking-tight text-[28px] font-bold leading-tight text-left pb-2">
          Verify Your Salon
        </h2>
        <p className="text-slate-400 dark:text-slate-400 text-base font-normal leading-normal pb-6">
          To comply with association standards and ensure security, please upload the following documents.
        </p>

        <div className="flex flex-col gap-4">
          {/* Business License - Uploaded */}
          <Accordion
            title="Business License"
            defaultOpen={true}
            status="success"
          >
            <p className="text-slate-400 dark:text-slate-400 text-sm font-normal leading-normal pb-4">
              Please provide a clear, color photo of the entire document. Accepted formats: JPG, PNG, PDF. Max size: 5MB.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-border-dark dark:border-border-dark bg-background-dark dark:bg-background-dark p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="material-symbols-outlined text-primary">description</span>
                <span className="text-sm font-medium text-text-dark dark:text-text-dark truncate">
                  {documents[0].name}
                </span>
              </div>
              <button
                onClick={() => handleDelete(documents[0].id)}
                className="text-danger"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  delete
                </span>
              </button>
            </div>
          </Accordion>

          {/* Owner's ID - Uploading */}
          <Accordion
            title="Owner's Government-Issued ID"
            defaultOpen={true}
            status="warning"
          >
            <p className="text-slate-400 dark:text-slate-400 text-sm font-normal leading-normal pb-4">
              Please provide a clear, color photo of your driver's license, passport, or national ID card.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-lg border border-border-dark dark:border-border-dark bg-background-dark dark:bg-background-dark p-3">
                <div className="relative">
                  <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: '24px' }}>
                    progress_activity
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-text-dark dark:text-text-dark truncate">
                    {documents[1].name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-400">
                    Uploading... {documents[1].progress}%
                  </p>
                </div>
              </div>
              <ProgressBar progress={documents[1].progress || 0} />
            </div>
          </Accordion>

          {/* Tax Information - Pending */}
          <Accordion
            title="Tax Information"
            status="pending"
          >
            <p className="text-slate-400 dark:text-slate-400 text-sm font-normal leading-normal pb-4">
              Provide a document with your Tax Identification Number (TIN).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-primary/30 dark:bg-primary/30 text-primary border-0"
                icon="photo_camera"
                onClick={() => handleUpload(documents[2].id, 'camera')}
              >
                Take Photo
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-primary/30 dark:bg-primary/30 text-primary border-0"
                icon="photo_library"
                onClick={() => handleUpload(documents[2].id, 'library')}
              >
                Choose from Library
              </Button>
            </div>
          </Accordion>

          {/* Proof of Address - Error */}
          <Accordion
            title="Proof of Address"
            status="error"
          >
            <p className="text-sm font-normal leading-normal pb-4 text-danger">
              {documents[3].errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-primary/30 dark:bg-primary/30 text-primary border-0"
                icon="photo_camera"
                onClick={() => handleUpload(documents[3].id, 'camera')}
              >
                Retake Photo
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-primary/30 dark:bg-primary/30 text-primary border-0"
                icon="photo_library"
                onClick={() => handleUpload(documents[3].id, 'library')}
              >
                Re-upload
              </Button>
            </div>
          </Accordion>
        </div>

        <div className="flex items-center gap-2 pt-6 text-slate-400 dark:text-slate-400">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            lock
          </span>
          <p className="text-xs">
            Your documents are encrypted and securely stored.{' '}
            <a className="font-medium text-primary" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-dark/80 dark:bg-surface-dark/80 backdrop-blur-sm border-t border-border-dark dark:border-border-dark">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={documents.some(doc => doc.status === 'pending' || doc.status === 'uploading')}
        >
          Submit Documents
        </Button>
      </div>
    </div>
  );
}

