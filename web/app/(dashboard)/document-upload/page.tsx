'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  ArrowLeft, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  ShieldCheck,
  Upload,
  FileCheck
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

interface DocumentFile {
  id: string;
  type: string;
  name: string;
  status: 'uploaded' | 'uploading' | 'pending' | 'error';
  progress?: number;
  errorMessage?: string;
  required: boolean;
  url?: string;
  fileId?: string;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [salonId, setSalonId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [documents, setDocuments] = useState<DocumentFile[]>([
    {
      id: '1',
      type: 'Business License',
      name: '',
      status: 'pending',
      required: true,
    },
    {
      id: '2',
      type: 'Owner ID (Front)',
      name: '',
      status: 'pending',
      required: true,
    },
    {
      id: '3',
      type: 'Tax Identification (TIN)',
      name: '',
      status: 'pending',
      required: true,
    },
    {
      id: '4',
      type: 'Proof of Address',
      name: '',
      status: 'pending',
      required: true,
    },
    {
        id: '5',
        type: 'Insurance Certificate',
        name: '',
        status: 'pending',
        required: false,
    }
  ]);

  // Fetch Salon ID
  useEffect(() => {
      const fetchSalon = async () => {
          try {
              const res = await api.get('/salons');
              if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                  setSalonId(res.data[0].id);
              }
          } catch (e) {
              console.error("Failed to fetch salon info", e);
          }
      };
      fetchSalon();
  }, []);

  // Fetch Uploaded Documents
  const { data: uploadedDocs } = useQuery({
    queryKey: ['documents', salonId],
    queryFn: async () => {
        if (!salonId) return [];
        const res = await api.get(`/salons/${salonId}/documents`);
        return res.data;
    },
    enabled: !!salonId
  });

  // Sync uploaded documents with local state
  useEffect(() => {
    if (uploadedDocs && Array.isArray(uploadedDocs)) {
        const typeMapReverse: Record<string, string> = {
             'business_license': 'Business License',
             'owner_id': 'Owner ID (Front)',
             'tax_id': 'Tax Identification (TIN)',
             'proof_of_address': 'Proof of Address',
             'insurance': 'Insurance Certificate'
        };

        setDocuments(prevDocs => prevDocs.map(doc => {
            const match = uploadedDocs.find((u: any) => 
                typeMapReverse[u.type] === doc.type || 
                (doc.type === 'Business License' && u.type === 'business_license')
            );
            
            if (match) {
                return {
                    ...doc,
                    status: 'uploaded',
                    progress: 100,
                    url: match.fileUrl,
                    fileId: match.mongoFileId,
                    name: match.filename || match.type
                };
            }
            return doc;
        }));
    }
  }, [uploadedDocs]);

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, docId, docType }: { file: File, docId: string, docType: string }) => {
        if (!salonId) throw new Error("Salon ID not found. Please refresh or create a salon first.");

        const formData = new FormData();
        formData.append('file', file);
        const uploadResponse = await api.post('/uploads/document', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        const typeMap: Record<string, string> = {
             'Business License': 'business_license',
             'Owner ID (Front)': 'owner_id',
             'Tax Identification (TIN)': 'tax_id',
             'Proof of Address': 'proof_of_address',
             'Insurance Certificate': 'insurance'
        };

        const docTypeEnum = typeMap[docType] || 'other';

        await api.post(`/salons/${salonId}/documents`, {
            type: docTypeEnum,
            fileUrl: uploadResponse.data.url,
            mongoFileId: uploadResponse.data.id,
            filename: file.name
        });

        return { response: uploadResponse.data, docId, fileName: file.name };
    },
    onMutate: ({ docId, file }) => {
        setDocuments(docs => docs.map(d => 
            d.id === docId ? { ...d, status: 'uploading', progress: 50, name: file.name } : d
        ));
    },
    onSuccess: ({ response, docId, fileName }) => {
        setDocuments(docs => docs.map(d => 
            d.id === docId ? { 
                ...d, 
                status: 'uploaded', 
                progress: 100, 
                url: response.url,
                fileId: response.id,
                name: fileName
            } : d
        ));
        
        queryClient.invalidateQueries({ queryKey: ['documents', salonId] });
        success('Document verified and saved');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
    },
    onError: (error: any, { docId }) => {
        setDocuments(docs => docs.map(d => 
            d.id === docId ? { 
                ...d, 
                status: 'error', 
                errorMessage: error.response?.data?.message || error.message || 'Upload failed',
                progress: 0 
            } : d
        ));
        toastError('Failed to upload document');
    }
  });

  // Verify Mutation
  const verifyMutation = useMutation({
      mutationFn: async () => {
          if (!salonId) return;
          await api.patch(`/salons/${salonId}`, { status: 'verification_pending' });
      },
      onMutate: () => setIsVerifying(true),
      onSettled: () => setIsVerifying(false),
      onSuccess: () => {
          success('Verification submitted successfully!');
          router.push('/'); 
      },
      onError: () => {
          toastError('Failed to submit verification.');
      }
  });

  const handleDelete = (id: string) => {
    setDocuments(docs => docs.map(doc => 
        doc.id === id ? { ...doc, status: 'pending', name: '', progress: 0, errorMessage: undefined, url: undefined, fileId: undefined } : doc
    ));
    success('File removed');
  };

  const openModal = (id: string) => {
      setSelectedDocId(id);
      setIsUploadModalOpen(true);
      setSelectedFile(null);
  };

  const handleFile = (file: File) => {
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        setSelectedFile(file);
    } else {
        toastError('Invalid file type. Please upload an image or PDF.');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const startUpload = () => {
    if (selectedFile && selectedDocId) {
        const doc = documents.find(d => d.id === selectedDocId);
        if (doc) {
           uploadMutation.mutate({ file: selectedFile, docId: selectedDocId, docType: doc.type });
        }
    }
  };

  const allRequiredUploaded = documents
    .filter(d => d.required)
    .every(d => d.status === 'uploaded');

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.back()} variant="secondary" size="sm" className="w-8 h-8 p-0 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-light dark:text-text-dark">Document Verification</h1>
            <p className="text-xs text-text-light/50 dark:text-text-dark/50 font-medium">Verify your salon identity</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-primary text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Encrypted & Secure</span>
             </div>
             <Button
                variant="primary"
                size="sm"
                onClick={() => verifyMutation.mutate()}
                disabled={!allRequiredUploaded || isVerifying}
                className={!allRequiredUploaded || isVerifying ? 'opacity-50 cursor-not-allowed' : ''}
              >
                  {isVerifying ? 'Submitting...' : 'Submit Verification'}
              </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-background-light/50 dark:bg-background-dark/50">
                <h3 className="text-sm font-bold text-text-light dark:text-text-dark">Required Documents</h3>
                <span className="text-xs text-text-light/50 dark:text-text-dark/50">
                    {documents.filter(d => d.status === 'uploaded' && d.required).length}/{documents.filter(d => d.required).length} Completed
                </span>
             </div>
             <div className="divide-y divide-border-light dark:divide-border-dark">
                {documents.map((doc) => (
                    <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-background-light/30 transition-colors group">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            doc.status === 'uploaded' ? 'bg-success/10 text-success' :
                            doc.status === 'error' ? 'bg-error/10 text-error' :
                            doc.status === 'uploading' ? 'bg-primary/10 text-primary' :
                            'bg-background-secondary dark:bg-background-tertiary text-text-light/40'
                        }`}>
                            {doc.status === 'uploaded' ? <CheckCircle2 className="w-5 h-5" /> :
                             doc.status === 'uploading' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                             doc.status === 'error' ? <AlertCircle className="w-5 h-5" /> :
                             <FileText className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm text-text-light dark:text-text-dark truncate">{doc.type}</p>
                                {doc.required && <Badge variant="primary" size="sm" className="text-[10px] h-5 px-1.5">Required</Badge>}
                            </div>
                            
                            {doc.status === 'error' ? (
                                <p className="text-xs text-error mt-0.5">{doc.errorMessage}</p>
                            ) : doc.status === 'uploading' ? (
                                <div className="mt-1.5 w-full max-w-[200px]">
                                    <div className="h-1.5 w-full bg-background-secondary dark:bg-background-tertiary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                                    </div>
                                    <p className="text-[10px] text-primary mt-1 text-right">Uploading...</p>
                                </div>
                            ) : doc.status === 'uploaded' ? (
                                <div className="flex flex-col">
                                    <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-0.5 truncate">{doc.name}</p>
                                    {doc.url && (
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline h-fit">
                                            View Uploaded File
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-text-light/40 dark:text-text-dark/40 mt-0.5">Not uploaded yet</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {doc.status === 'uploaded' ? (
                                <button 
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-2 text-text-light/40 hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <Button 
                                    onClick={() => openModal(doc.id)} 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs border-dashed border-border-light hover:border-primary hover:bg-primary hover:text-white"
                                    disabled={doc.status === 'uploading'}
                                >
                                    <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                                    {doc.status === 'error' ? 'Retry' : 'Upload'}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
             </div>
          </div>

          <div className="space-y-4">
             <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-text-light dark:text-text-dark mb-2">Instructions</h3>
                <ul className="space-y-3">
                    {[
                        "Ensure all documents are valid and not expired.",
                        "Text should be clear and readable.",
                        "Supported formats: JPG, PNG, PDF.",
                        "Max file size: 5MB per document."
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-text-light/70 dark:text-text-dark/70">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
             </div>

             <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                <div className="p-2 rounded-full bg-primary/10 text-primary flex-shrink-0 h-fit">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="text-xs font-bold text-primary mb-1">Privacy Guarantee</h4>
                   <p className="text-[10px] text-text-light/60 dark:text-text-dark/60 leading-relaxed">
                       Your personal documents are encrypted at rest and in transit. They are only accessible by authorized verification officers.
                   </p>
                </div>
             </div>
          </div>
      </div>

      {/* Upload Modal */}
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => !uploadMutation.isPending && setIsUploadModalOpen(false)}
        title={`Upload ${selectedDoc?.type || 'Document'}`}
        size="md"
      >
        <div className="space-y-4 py-2">
            {!selectedFile ? (
                <div 
                    className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                        dragActive ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        onChange={handleChange}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                    />
                    <div className="w-12 h-12 rounded-full bg-background-secondary dark:bg-background-tertiary flex items-center justify-center text-text-light/40">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark">Click to upload or drag and drop</p>
                        <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">PNG, JPG or PDF (max. 5MB)</p>
                    </div>
                </div>
            ) : (
                <div className="border border-border-light dark:border-border-dark rounded-xl p-4 bg-background-light/30 dark:bg-background-dark/30 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        {selectedFile.type === 'application/pdf' ? <FileText className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-light dark:text-text-dark truncate">{selectedFile.name}</p>
                        <p className="text-xs text-text-light/50 dark:text-text-dark/50">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    {!uploadMutation.isPending && (
                        <button 
                            onClick={() => setSelectedFile(null)}
                            className="p-2 text-text-light/40 hover:text-error hover:bg-error/10 rounded-md transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {uploadMutation.isPending && (
                <div className="space-y-2">
                    <div className="h-2 w-full bg-background-secondary dark:bg-background-tertiary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-progress" style={{ width: '100%' }} />
                    </div>
                    <p className="text-[10px] text-primary font-medium text-center">Processing and verifying document...</p>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={uploadMutation.isPending}
                >
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    className="flex-1" 
                    disabled={!selectedFile || uploadMutation.isPending}
                    onClick={startUpload}
                >
                    {uploadMutation.isPending ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : 'Confirm Upload'}
                </Button>
            </div>
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
