'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/permissions';
import {
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  StarOff,
  Upload,
  XCircle,
  Play,
  File,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/components/ui/Toast';

interface Resource {
  id: string;
  title: string;
  description?: string;
  type: string;
  category: string;
  status: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  isFeatured: boolean;
  isPublic: boolean;
  viewCount: number;
  downloadCount: number;
  tags: string[];
  publishedAt?: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
}

export default function ResourcesPage() {
  return (
    <ProtectedRoute
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ASSOCIATION_ADMIN,
        UserRole.DISTRICT_LEADER,
        UserRole.SALON_OWNER,
        UserRole.SALON_EMPLOYEE,
        UserRole.CUSTOMER,
      ]}
    >
      <ResourcesContent />
    </ProtectedRoute>
  );
}

function ResourcesContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Resource | null>(null);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'association_admin';

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ['resources', filterCategory, filterType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterType !== 'all') params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      const response = await api.get(`/resources?${params.toString()}`);
      return response.data?.data || response.data || [];
    },
  });

  // Fetch featured resources
  const { data: featuredResources = [] } = useQuery<Resource[]>({
    queryKey: ['featured-resources'],
    queryFn: async () => {
      const response = await api.get('/resources/featured');
      return response.data?.data || response.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['featured-resources'] });
      success('Resource deleted successfully');
      setDeleteConfirmation(null);
    },
    onError: () => toastError('Failed to delete resource'),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      await api.patch(`/resources/${id}`, { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['featured-resources'] });
      success('Resource updated successfully');
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/resources/${id}/download`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    },
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'guidelines', label: 'Guidelines' },
    { value: 'policies', label: 'Policies' },
    { value: 'training', label: 'Training' },
    { value: 'forms', label: 'Forms' },
    { value: 'templates', label: 'Templates' },
    { value: 'announcements', label: 'Announcements' },
    { value: 'other', label: 'Other' },
  ];

  const types = [
    { value: 'all', label: 'All Types' },
    { value: 'document', label: 'Documents' },
    { value: 'video', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'image', label: 'Images' },
    { value: 'link', label: 'Links' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-text-light/50 dark:text-text-dark/50 mt-4">
            Loading resources...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">
            Resource Library
          </h1>
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mt-1">
            Access guidelines, documents, training materials, and more
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Resource
          </Button>
        )}
      </div>

      {/* Featured Resources */}
      {featuredResources.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-light dark:text-text-dark flex items-center gap-2">
            <Star className="w-5 h-5 text-warning fill-current" />
            Featured Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredResources.slice(0, 3).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isAdmin={isAdmin}
                onDelete={() => setDeleteConfirmation(resource)}
                onToggleFeatured={() => {
                  toggleFeaturedMutation.mutate({
                    id: resource.id,
                    isFeatured: !resource.isFeatured,
                  });
                }}
                onDownload={() => downloadMutation.mutate(resource.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search - Compact Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-surface-light dark:bg-surface-dark p-2 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="relative w-full md:w-auto md:flex-1 max-w-md ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm text-text-light dark:text-text-dark placeholder:text-text-light/40 dark:placeholder:text-text-dark/40 focus:outline-none"
          />
        </div>
        
        <div className="h-6 w-px bg-border-light dark:bg-border-dark hidden md:block" />

        <div className="flex items-center gap-2 w-full md:w-auto px-2">
          <Filter className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-transparent text-sm font-medium text-text-light dark:text-text-dark focus:outline-none cursor-pointer hover:text-primary transition-colors pr-8"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-surface-light dark:bg-surface-dark">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-border-light dark:bg-border-dark hidden md:block" />

        <div className="flex items-center gap-2 w-full md:w-auto px-2 mr-2">
           <FolderOpen className="w-4 h-4 text-text-light/40 dark:text-text-dark/40" />
           <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
             className="bg-transparent text-sm font-medium text-text-light dark:text-text-dark focus:outline-none cursor-pointer hover:text-primary transition-colors pr-8"
          >
            {types.map((type) => (
              <option key={type.value} value={type.value} className="bg-surface-light dark:bg-surface-dark">
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {resources.length === 0 ? (
         <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-12">
            <EmptyState
                icon={<FolderOpen className="w-16 h-16" />}
                title="No Resources Found"
                description={
                searchQuery || filterCategory !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your search criteria or filters.'
                    : 'No resources have been uploaded yet.'
                }
                action={isAdmin ? (
                   <Button onClick={() => setShowUploadModal(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload First Resource
                   </Button>
                ) : null}
            />
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isAdmin={isAdmin}
              onDelete={() => setDeleteConfirmation(resource)}
              onToggleFeatured={() => {
                toggleFeaturedMutation.mutate({
                  id: resource.id,
                  isFeatured: !resource.isFeatured,
                });
              }}
              onDownload={() => downloadMutation.mutate(resource.id)}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <ResourceUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['resources'] });
            queryClient.invalidateQueries({ queryKey: ['featured-resources'] });
            success('Resource uploaded successfully');
            setShowUploadModal(false);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          if (deleteConfirmation) deleteMutation.mutate(deleteConfirmation.id);
        }}
        title="Delete Resource"
        message={`Are you sure you want to delete "${deleteConfirmation?.title}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        isProcessing={deleteMutation.isPending}
      />
    </div>
  );
}

function ResourceCard({
  resource,
  isAdmin,
  onDelete,
  onToggleFeatured,
  onDownload,
}: {
  resource: Resource;
  isAdmin: boolean;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onDownload: () => void;
}) {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'video':
        return { icon: <Video className="w-5 h-5 text-white" />, gradient: 'from-red-500 to-pink-600' };
      case 'audio':
        return { icon: <Music className="w-5 h-5 text-white" />, gradient: 'from-purple-500 to-indigo-600' };
      case 'image':
        return { icon: <ImageIcon className="w-5 h-5 text-white" />, gradient: 'from-green-500 to-emerald-600' };
      case 'link':
        return { icon: <LinkIcon className="w-5 h-5 text-white" />, gradient: 'from-orange-500 to-amber-600' };
      default:
        return { icon: <FileText className="w-5 h-5 text-white" />, gradient: 'from-blue-500 to-cyan-600' };
    }
  };

  const config = getTypeConfig(resource.type);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl shadow-md bg-gradient-to-br ${config.gradient}`}>
            {config.icon}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFeatured(); }}
                className={`p-1.5 rounded-lg transition-colors ${
                    resource.isFeatured 
                        ? 'text-warning hover:bg-warning/10' 
                        : 'text-text-light/40 hover:text-warning hover:bg-warning/10'
                }`}
                title={resource.isFeatured ? 'Remove from featured' : 'Mark as featured'}
              >
                  {resource.isFeatured ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 text-text-light/40 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-2 line-clamp-2 leading-tight">
          {resource.title}
        </h3>
        {resource.description && (
          <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4 line-clamp-2 min-h-[2.5em]">
            {resource.description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap mt-auto">
          <Badge variant="default" size="sm" className="capitalize">
             {resource.category}
          </Badge>
          {resource.tags?.slice(0, 2).map((tag, idx) => (
             <Badge key={idx} variant="primary" size="sm" className="opacity-80">
                {tag}
             </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-text-light/50 dark:text-text-dark/50 pt-4 border-t border-border-light/50 dark:border-border-dark/50">
           <div className="flex items-center gap-2">
               {resource.fileSize ? formatFileSize(resource.fileSize) : resource.durationSeconds ? formatDuration(resource.durationSeconds) : 'N/A'}
           </div>
           
           <div className="flex items-center justify-end gap-3">
              <span className="flex items-center gap-1" title="Views">
                  <Eye className="w-3.5 h-3.5" /> {resource.viewCount}
              </span>
              <span className="flex items-center gap-1" title="Downloads">
                  <Download className="w-3.5 h-3.5" /> {resource.downloadCount}
              </span>
           </div>
        </div>
      </div>
      
      {/* Action Area */}
      <div className="px-5 pb-5 pt-0">
         <Button 
            onClick={onDownload} 
            className="w-full justify-center"
            variant="outline"
         >
             {resource.type === 'video' || resource.type === 'audio' ? <Play className="w-4 h-4 mr-2" /> : <Download className="w-4 h-4 mr-2" />}
             {resource.type === 'video' || resource.type === 'audio' ? 'Play Now' : 'Download Resource'}
         </Button>
      </div>
    </div>
  );
}

function ResourceUploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'document',
    category: 'other',
    tags: '',
    isFeatured: false,
    isPublic: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      const response = await api.post('/resources/upload', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload'); // Could use toast here if available in context
      return;
    }

    setIsUploading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('type', formData.type);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('tags', JSON.stringify(formData.tags.split(',').map((t) => t.trim()).filter(Boolean)));
      
      if(formData.isFeatured) formDataToSend.append('isFeatured', 'true');
      if(formData.isPublic) formDataToSend.append('isPublic', 'true');


      await uploadMutation.mutateAsync(formDataToSend);
    } catch (error) {
       // toast handled by mutation error usually or hook logic
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border-light dark:border-border-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="w-5 h-5 text-primary" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-text-light dark:text-text-dark">
                  Upload Resource
                </h2>
                <p className="text-xs text-text-light/60 dark:text-text-dark/60">
                   Share documents, videos, audio, or links
                </p>
             </div>
          </div>
          <button 
             onClick={onClose} 
             className="text-text-light/40 hover:text-text-light dark:text-text-dark/40 dark:hover:text-text-dark transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="upload-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                File *
              </label>
              <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-xl p-8 text-center hover:border-primary/50 transition bg-background-light/50 dark:bg-background-dark/50">
                 <input
                    type="file"
                    id="file-upload"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.mp4,.avi,.mov,.mp3,.wav,.jpg,.jpeg,.png,.gif"
                 />
                 <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    {selectedFile ? (
                        <>
                           <FileText className="w-8 h-8 text-primary mb-2" />
                           <p className="text-sm font-medium text-text-light dark:text-text-dark">{selectedFile.name}</p>
                           <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">
                               {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                           </p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-text-light/30 dark:text-text-dark/30 mb-2" />
                            <p className="text-sm font-medium text-text-light dark:text-text-dark">Click to upload or drag and drop</p>
                            <p className="text-xs text-text-light/50 dark:text-text-dark/50 mt-1">
                                PDF, Word, Video, Audio, Images (Max 50MB)
                            </p>
                        </>
                    )}
                 </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="Resource title"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                placeholder="Brief description of the resource"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                >
                  <option value="guidelines">Guidelines</option>
                  <option value="policies">Policies</option>
                  <option value="training">Training</option>
                  <option value="forms">Forms</option>
                  <option value="templates">Templates</option>
                  <option value="announcements">Announcements</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-light/70 dark:text-text-dark/70 mb-1.5 uppercase">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="e.g., safety, compliance"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="flex items-center gap-3 p-3 border border-border-light dark:border-border-dark rounded-xl bg-background-secondary/30 dark:bg-background-dark/30">
                    <input 
                        type="checkbox" 
                        id="isFeatured" 
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    />
                    <label htmlFor="isFeatured" className="cursor-pointer">
                        <p className="text-sm font-bold text-text-light dark:text-text-dark">Featured</p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Show in featured section</p>
                    </label>
                </div>
                 <div className="flex items-center gap-3 p-3 border border-border-light dark:border-border-dark rounded-xl bg-background-secondary/30 dark:bg-background-dark/30">
                     <input 
                        type="checkbox" 
                        id="isPublic" 
                        className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                        checked={formData.isPublic}
                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    />
                    <label htmlFor="isPublic" className="cursor-pointer">
                        <p className="text-sm font-bold text-text-light dark:text-text-dark">Public Access</p>
                        <p className="text-xs text-text-light/60 dark:text-text-dark/60">Visible to all users</p>
                    </label>
                </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark flex items-center justify-end gap-3 rounded-b-2xl">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              form="upload-form"
              type="submit"
              disabled={isUploading || !selectedFile}
              loading={isUploading}
            >
              Upload Resource
            </Button>
        </div>
      </div>
    </div>
  );
}

