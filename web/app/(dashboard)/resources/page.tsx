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
  X,
  Play,
  File,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

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
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ASSOCIATION_ADMIN, UserRole.DISTRICT_LEADER, UserRole.SALON_OWNER, UserRole.SALON_EMPLOYEE, UserRole.CUSTOMER]}>
      <ResourcesContent />
    </ProtectedRoute>
  );
}

function ResourcesContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

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
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      await api.patch(`/resources/${id}`, { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['featured-resources'] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/resources/${id}/download`);
      return response.data;
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'link':
        return <LinkIcon className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      document: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      video: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      audio: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      image: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      link: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[type] || colors.document;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resource Library</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Access guidelines, documents, training materials, and more
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Upload className="w-4 h-4" />
            Upload Resource
          </button>
        )}
      </div>

      {/* Featured Resources */}
      {featuredResources.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Featured Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredResources.slice(0, 3).map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isAdmin={isAdmin}
                onDelete={() => {
                  if (confirm('Delete this resource?')) {
                    deleteMutation.mutate(resource.id);
                  }
                }}
                onToggleFeatured={() => {
                  toggleFeaturedMutation.mutate({ id: resource.id, isFeatured: !resource.isFeatured });
                }}
                onDownload={() => downloadMutation.mutate(resource.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading resources...</p>
          </div>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Resources Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterCategory !== 'all' || filterType !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No resources available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isAdmin={isAdmin}
              onDelete={() => {
                if (confirm('Delete this resource?')) {
                  deleteMutation.mutate(resource.id);
                }
              }}
              onToggleFeatured={() => {
                toggleFeaturedMutation.mutate({ id: resource.id, isFeatured: !resource.isFeatured });
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
            setShowUploadModal(false);
          }}
        />
      )}
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
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'link':
        return <LinkIcon className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      document: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      video: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      audio: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      image: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      link: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[type] || colors.document;
  };

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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${getTypeColor(resource.type)}`}>
          {getTypeIcon(resource.type)}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFeatured}
              className="p-1 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
              title={resource.isFeatured ? 'Remove from featured' : 'Mark as featured'}
            >
              {resource.isFeatured ? (
                <Star className="w-4 h-4 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{resource.title}</h3>
      {resource.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{resource.description}</p>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded capitalize">
          {resource.category}
        </span>
        {resource.tags && resource.tags.length > 0 && (
          <>
            {resource.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded"
              >
                {tag}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-3">
          {resource.fileSize && <span>{formatFileSize(resource.fileSize)}</span>}
          {resource.durationSeconds && <span>{formatDuration(resource.durationSeconds)}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {resource.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {resource.downloadCount}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Download className="w-4 h-4" />
          {resource.type === 'video' || resource.type === 'audio' ? 'View' : 'Download'}
        </button>
        {resource.type === 'link' && resource.externalUrl && (
          <a
            href={resource.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <LinkIcon className="w-4 h-4" />
          </a>
        )}
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
      alert('Please select a file to upload');
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

      await uploadMutation.mutateAsync(formDataToSend);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload resource. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Resource</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share documents, videos, audio, or links</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File *
            </label>
            <input
              type="file"
              required
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              accept=".pdf,.doc,.docx,.mp4,.avi,.mov,.mp3,.wav,.jpg,.jpeg,.png,.gif"
            />
            {selectedFile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Resource title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Brief description of the resource"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., safety, compliance, training"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Featured Resource</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show this resource in the featured section
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Public Access</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Make this resource accessible to all members
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isUploading ? 'Uploading...' : 'Upload Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

