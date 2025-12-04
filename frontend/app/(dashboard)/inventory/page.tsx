'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Package, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  isInventoryItem: boolean;
}

export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/inventory/products');
      return response.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading inventory...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">Manage products and stock</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products?.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.sku || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RWF {product.unitPrice?.toLocaleString() || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isInventoryItem
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.isInventoryItem ? 'Inventory' : 'Service'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Edit className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this product?')) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {products?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No products found. Add your first product to get started.</p>
        </div>
      )}

      {showModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setShowModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onSuccess,
}: {
  product?: Product | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    salonId: '',
    name: product?.name || '',
    sku: product?.sku || '',
    unitPrice: product?.unitPrice || 0,
    isInventoryItem: product?.isInventoryItem ?? true,
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: salons } = useQuery({
    queryKey: ['salons'],
    queryFn: async () => {
      const response = await api.get('/salons');
      return response.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (product) {
        return api.patch(`/inventory/products/${product.id}`, data);
      } else {
        return api.post('/inventory/products', data);
      }
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save product');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    mutation.mutate(formData, {
      onSettled: () => setLoading(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {product ? 'Edit Product' : 'Add New Product'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salon *</label>
            <select
              required
              value={formData.salonId}
              onChange={(e) => setFormData({ ...formData, salonId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select salon</option>
              {salons?.map((salon: any) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Product SKU (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (RWF) *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isInventoryItem}
                onChange={(e) => setFormData({ ...formData, isInventoryItem: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Track inventory for this item</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : product ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

