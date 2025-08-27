'use client';

import { 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Search, 
  Edit, 
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  BarChart3,
  Download,
  Upload,
  Settings,
  Filter,
  Eye,
  Archive,
  DollarSign,
  ArrowUp,
  ArrowDown,
  User,
  Clock,
  FileText,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog.jsx';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { ImageUpload } from '../ui/ProductImageUpload';
import { Separator } from '../ui/Separator';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.jsx';
import Cin7SyncStatus from './Cin7SyncStatus';
import ProductBridgeSelector from './ProductBridgeSelector';

export function LocalInventoryManager({ barbershopId }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [movements, setMovements] = useState([]);
  const [movementsSummary, setMovementsSummary] = useState({
    totalMovements: 0,
    totalIn: 0,
    totalOut: 0,
    totalValue: 0,
    movementTypes: []
  });
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementFilter, setMovementFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    description: '',
    quantity_on_hand: 0,
    cost_price: '',
    retail_price: '',
    reorder_point: 5,
    reorder_quantity: 10,
    track_inventory: true,
    show_in_pos: true,
    commission_rate: 10,
    image_url: ''
  });
  const [addingProduct, setAddingProduct] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showPOSSelector, setShowPOSSelector] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const { toast } = useToast();

  // Modal control functions - ensure only one modal at a time
  const openEditDialog = (product) => {
    // Close all other modals first
    setShowAddProduct(false);
    setShowDeleteConfirm(false);
    setShowPOSSelector(false);
    
    // Set the product to edit and open the modal
    setEditingProduct(product);
    setShowEditProduct(true);
  };

  const openDeleteConfirm = (product) => {
    // Close all other modals first
    setShowAddProduct(false);
    setShowEditProduct(false);
    setShowPOSSelector(false);
    
    // Set the product to delete and open the confirmation
    setDeletingProductId(product.id);
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const closeAllModals = () => {
    setShowAddProduct(false);
    setShowEditProduct(false);
    setShowDeleteConfirm(false);
    setShowPOSSelector(false);
    setEditingProduct(null);
    setDeletingProductId(null);
    setProductToDelete(null);
  };

  useEffect(() => {
    // Ensure all modals are closed on mount
    closeAllModals();
    loadInventory();
  }, [barbershopId]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, stockFilter]);

  useEffect(() => {
    if (barbershopId) {
      loadStockMovements();
    }
  }, [barbershopId, movementFilter]);

  useEffect(() => {
    if (barbershopId) {
      loadAnalytics();
    }
  }, [barbershopId]);

  // Callback for refreshing inventory after CIN7 sync or POS selection
  const refreshInventory = async () => {
    await loadInventory();
    if (barbershopId) {
      await loadStockMovements();
      await loadAnalytics();
    }
    toast({
      title: "Success",
      description: "Inventory data refreshed",
      variant: "default"
    });
  };

  const handleSyncComplete = async (syncData) => {
    
    await refreshInventory();
  };

  const handlePOSSelectionComplete = async () => {
    
    setShowPOSSelector(false);
    await refreshInventory();
  };

  const handleProductsAdded = async (result) => {
    toast({
      title: "Products Added Successfully",
      description: `Added ${result.added} products to inventory${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}.`,
      status: "success"
    });
    
    // Refresh the inventory to show the new products
    await refreshInventory();
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        show_in_pos: 'false' // Show all products, not just POS
      });

      const response = await fetch(`/api/inventory/products?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
        setAnalytics(data.analytics || {});
      } else {
        throw new Error(data.error || 'Failed to load inventory');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async () => {
    setMovementsLoading(true);
    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        movement_type: movementFilter,
        limit: '50'
      });

      const response = await fetch(`/api/inventory/movements?${params}`);
      const data = await response.json();

      if (response.ok) {
        setMovements(data.movements || []);
        setMovementsSummary(data.summary || {});
      } else {
        throw new Error(data.error || 'Failed to load movements');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setMovementsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        days: '30'
      });

      const response = await fetch(`/api/inventory/analytics?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAnalyticsData(data.analytics);
      } else {
        throw new Error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      toast({
        title: "Analytics Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    switch (stockFilter) {
      case 'low':
        filtered = filtered.filter(p => p.quantity_available <= p.reorder_point && p.quantity_available > 0);
        break;
      case 'out':
        filtered = filtered.filter(p => p.quantity_available === 0);
        break;
      case 'overstock':
        filtered = filtered.filter(p => p.quantity_available > p.max_stock_level);
        break;
    }

    setFilteredProducts(filtered);
  };

  const handleStockAdjustment = async (product, adjustment, type, reason) => {
    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          inventory_id: product.id,
          adjustment_type: type,
          quantity_change: adjustment,
          reason: reason || 'Manual adjustment'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Stock Updated",
          description: `${product.name} stock adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`,
        });
        loadInventory();
        loadStockMovements(); // Refresh movements after adjustment
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Adjustment Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleBulkCount = async (counts) => {
    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          adjustments: counts,
          adjustment_type: 'count'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Cycle Count Complete",
          description: `Updated ${data.results.length} products`,
        });
        loadInventory();
        loadStockMovements(); // Refresh movements after bulk adjustment
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Count Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddProduct = async () => {
    setAddingProduct(true);
    try {
      const productData = {
        ...newProduct,
        barbershop_id: barbershopId,
        cost_price: parseFloat(newProduct.cost_price) || 0,
        retail_price: parseFloat(newProduct.retail_price) || 0
      };

      const response = await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Product Added",
          description: `${newProduct.name} has been added to your inventory`,
        });
        closeAllModals();
        setNewProduct({
          name: '',
          sku: '',
          barcode: '',
          category: '',
          brand: '',
          description: '',
          quantity_on_hand: 0,
          cost_price: '',
          retail_price: '',
          reorder_point: 5,
          reorder_quantity: 10,
          track_inventory: true,
          show_in_pos: true,
          commission_rate: 10,
          image_url: ''
        });
        loadInventory();
        loadStockMovements(); // Refresh movements to show initial stock
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to Add Product",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAddingProduct(false);
    }
  };

  const handleEditProduct = async () => {
    setAddingProduct(true);
    try {
      const productData = {
        ...editingProduct,
        barbershop_id: barbershopId,
        cost_price: parseFloat(editingProduct.cost_price) || 0,
        retail_price: parseFloat(editingProduct.retail_price) || 0
      };

      const response = await fetch(`/api/inventory/products?product_id=${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Product Updated",
          description: "Product has been successfully updated."
        });
        closeAllModals();
        loadInventory();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Failed to Update Product",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    setDeletingProductId(productToDelete?.id);
    try {
      const response = await fetch(`/api/inventory/products?product_id=${productToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Product Deleted",
          description: "Product has been successfully removed from inventory."
        });
        closeAllModals();
        loadInventory();
        loadStockMovements();
      } else {
        throw new Error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      toast({
        title: "Failed to Delete Product",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingProductId(null);
    }
  };

  const getStockStatus = (product) => {
    if (product.quantity_available === 0) {
      return { status: 'out', color: 'destructive', label: 'Out of Stock' };
    } else if (product.quantity_available <= product.reorder_point) {
      return { status: 'low', color: 'warning', label: 'Low Stock' };
    } else if (product.quantity_available > (product.max_stock_level || 100)) {
      return { status: 'overstock', color: 'secondary', label: 'Overstock' };
    }
    return { status: 'good', color: 'default', label: 'In Stock' };
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* CIN7 Integration Status */}
      <Cin7SyncStatus onSyncComplete={handleSyncComplete} />
      
      {/* Header with Analytics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProducts}</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>{products.filter(p => p.track_inventory).length} tracked</div>
              <div className="flex gap-2">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                  {products.filter(p => p.sync_enabled).length} from CIN7
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  {products.filter(p => !p.sync_enabled).length} custom
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              At cost price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{analytics.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Need reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{analytics.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Unavailable items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Inventory Interface */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Local Inventory Management</CardTitle>
                <CardDescription>
                  Track your shop's inventory from multiple sources
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadInventory} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="movements">Stock Movements</TabsTrigger>
              <TabsTrigger value="reorder">Reorder Management</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    closeAllModals();
                    setShowAddProduct(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Product
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    closeAllModals();
                    setShowPOSSelector(true);
                  }}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Select from CIN7
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredProducts.length} products • ${analytics.totalValue.toFixed(2)} total value
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                  <option value="overstock">Overstock</option>
                </select>

                <div className="text-sm text-muted-foreground flex items-center justify-end">
                  Showing {filteredProducts.length} of {products.length}
                </div>
              </div>

              {/* Products Table */}
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Source</th>
                      <th className="p-2 text-center">Stock</th>
                      <th className="p-2 text-center">Reorder</th>
                      <th className="p-2 text-right">Cost</th>
                      <th className="p-2 text-right">Retail</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const profitMargin = product.retail_price && product.cost_price
                        ? ((product.retail_price - product.cost_price) / product.retail_price * 100).toFixed(1)
                        : 0;

                      return (
                        <tr key={product.id} className="border-b hover:bg-muted/25">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {product.image_url && (
                                <img
                                  src={product.thumbnail_url || product.image_url}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.brand && (
                                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              {product.sku}
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground">{product.barcode}</div>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge variant={product.product_source === 'bookedbarber' ? 'default' : 'secondary'}>
                              {product.product_source === 'bookedbarber' ? 'BookedBarber' : 
                               product.product_source === 'custom' ? 'Custom' : 'Other'}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <div className="font-medium">{product.quantity_on_hand}</div>
                            {product.quantity_reserved > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {product.quantity_reserved} reserved
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <div className="text-sm">{product.reorder_point}</div>
                            {product.auto_reorder && (
                              <Badge variant="outline" className="text-xs">Auto</Badge>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            ${product.cost_price?.toFixed(2) || '-'}
                          </td>
                          <td className="p-2 text-right">
                            <div>${product.retail_price?.toFixed(2)}</div>
                            {profitMargin > 0 && (
                              <div className="text-xs text-green-600">+{profitMargin}%</div>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStockAdjustment(product, 1, 'received', 'Quick add')}
                                title="Add stock"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStockAdjustment(product, -1, 'sale', 'Quick deduct')}
                                title="Remove stock"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(product)}
                                title="Edit product"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDeleteConfirm(product)}
                                title="Delete product"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="movements" className="space-y-4">
              {/* Movement Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{movementsSummary.totalMovements}</div>
                    <p className="text-xs text-muted-foreground">
                      Last 50 records
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stock In</CardTitle>
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+{movementsSummary.totalIn}</div>
                    <p className="text-xs text-muted-foreground">
                      Units received
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
                    <ArrowDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">-{movementsSummary.totalOut}</div>
                    <p className="text-xs text-muted-foreground">
                      Units used/sold
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Value Impact</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${Math.abs(movementsSummary.totalValue || 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total cost change
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Stock Movement History</CardTitle>
                      <CardDescription>Track all inventory changes and adjustments</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={movementFilter}
                        onChange={(e) => setMovementFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background text-sm"
                      >
                        <option value="all">All Types</option>
                        <option value="received">Received</option>
                        <option value="sale">Sales</option>
                        <option value="adjustment">Adjustments</option>
                        <option value="count">Cycle Count</option>
                        <option value="damaged">Damaged</option>
                        <option value="expired">Expired</option>
                      </select>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadStockMovements}
                        disabled={movementsLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${movementsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {movementsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : movements.length > 0 ? (
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="p-3 text-left">Date & Time</th>
                            <th className="p-3 text-left">Product</th>
                            <th className="p-3 text-center">Type</th>
                            <th className="p-3 text-center">Change</th>
                            <th className="p-3 text-center">Before/After</th>
                            <th className="p-3 text-center">Cost Impact</th>
                            <th className="p-3 text-left">Reason</th>
                            <th className="p-3 text-left">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movements.map((movement) => {
                            const isPositive = movement.quantity_change > 0;
                            const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
                            const changeIcon = isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
                            
                            return (
                              <tr key={movement.id} className="border-b hover:bg-muted/25">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <div className="text-sm">
                                      <div>{new Date(movement.created_at).toLocaleDateString()}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(movement.created_at).toLocaleTimeString()}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {movement.barbershop_inventory?.image_url && (
                                      <img
                                        src={movement.barbershop_inventory.image_url}
                                        alt={movement.barbershop_inventory.name}
                                        className="w-8 h-8 object-cover rounded"
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">
                                        {movement.barbershop_inventory?.name || 'Unknown Product'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {movement.barbershop_inventory?.sku}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <Badge 
                                    variant={
                                      movement.movement_type === 'received' ? 'default' :
                                      movement.movement_type === 'sale' ? 'destructive' :
                                      movement.movement_type === 'adjustment' ? 'secondary' :
                                      'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {movement.movement_type}
                                  </Badge>
                                </td>
                                <td className={`p-3 text-center font-medium ${changeColor}`}>
                                  <div className="flex items-center justify-center gap-1">
                                    {changeIcon}
                                    {Math.abs(movement.quantity_change)}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">{movement.stock_before}</span>
                                    <span className="mx-1">→</span>
                                    <span className="font-medium">{movement.stock_after}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <div className={`text-sm font-medium ${
                                    (movement.total_cost_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    ${Math.abs(movement.total_cost_change || 0).toFixed(2)}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="text-sm">
                                    <div>{movement.reason}</div>
                                    {movement.notes && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {movement.notes}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div className="text-sm">
                                      {movement.performer?.profiles?.full_name || 'System'}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No stock movements found</p>
                      <p className="text-sm mt-1">
                        Stock movements will appear here when you adjust inventory levels
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reorder" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reorder Management</CardTitle>
                  <CardDescription>Configure automatic reordering and view suggestions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {products
                        .filter(p => p.quantity_available <= p.reorder_point)
                        .map(product => (
                          <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Current: {product.quantity_available} | Reorder at: {product.reorder_point}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={product.product_source === 'bookedbarber' ? 'default' : 'secondary'}>
                                {product.preferred_supplier || product.product_source}
                              </Badge>
                              <Button size="sm">
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Reorder {product.reorder_quantity} units
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analyticsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Key Metrics Overview */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Overstock Items</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{analyticsData.overview?.overstockItems || 0}</div>
                        <p className="text-xs text-muted-foreground">Items above max stock level</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{analyticsData.movementTrends?.totalMovements || 0}</div>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Value In</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          ${(analyticsData.movementTrends?.valueIn || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">Stock received value</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Value Out</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          ${(analyticsData.movementTrends?.valueOut || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">Stock used value</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Category Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Category Performance</CardTitle>
                        <CardDescription>Inventory value and turnover by category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {Object.entries(analyticsData.categoryBreakdown || {}).map(([category, data]) => (
                            <div key={category} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{category}</span>
                                <span className="text-sm text-muted-foreground">
                                  {data.productCount} products
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>Value: ${data.totalValue?.toFixed(2)}</span>
                                <span>Turnover: {data.averageTurnover?.toFixed(1)}%</span>
                                {data.lowStockCount > 0 && (
                                  <span className="text-red-600">{data.lowStockCount} low stock</span>
                                )}
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ 
                                    width: `${Math.min(data.averageTurnover || 0, 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Most Used Products</CardTitle>
                        <CardDescription>Top 5 products by usage (last 30 days)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(analyticsData.topProducts?.mostUsed || []).map((product, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{product.name}</div>
                                <div className="text-xs text-muted-foreground">{product.category}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{product.totalUsed} used</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.usageCount} transactions
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!analyticsData.topProducts?.mostUsed || analyticsData.topProducts.mostUsed.length === 0) && (
                            <div className="text-center text-muted-foreground text-sm py-4">
                              No usage data available yet
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Daily Trends */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Weekly Movement Trends</CardTitle>
                        <CardDescription>Daily stock movements (last 7 days)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(analyticsData.dailyTrends || []).map((day, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-green-600">+{day.received}</span>
                                <span className="text-xs text-red-600">-{day.used}</span>
                                <span className="text-sm font-medium">
                                  Net: {day.net >= 0 ? '+' : ''}{day.net}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reorder Recommendations */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Reorder Recommendations</CardTitle>
                        <CardDescription>Products requiring attention</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {(analyticsData.reorderRecommendations || []).map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border border-orange-200 bg-orange-50">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{item.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Current: {item.currentStock} | Reorder at: {item.reorderPoint}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium ${item.priority === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                                  {item.priority.toUpperCase()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${item.estimatedCost?.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!analyticsData.reorderRecommendations || analyticsData.reorderRecommendations.length === 0) && (
                            <div className="text-center text-muted-foreground text-sm py-4">
                              All products are well stocked
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                      <p>No analytics data available. Add some products and movements to see insights.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <Dialog open={showAddProduct} onOpenChange={(open) => {
        if (!open) closeAllModals();
        else setShowAddProduct(open);
      }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Add Custom Product
            </DialogTitle>
            <DialogDescription>
              Add a product from local suppliers or create your own branded items. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="bg-slate-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Basic Information</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Product Name *</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="e.g., Premium Hair Pomade"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-sm font-medium">Brand</Label>
                    <Input
                      id="brand"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                      placeholder="e.g., BookedBarber Essentials"
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku" className="text-sm font-medium">SKU *</Label>
                    <Input
                      id="sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                      placeholder="e.g., BB-POMADE-001"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                    <Input
                      id="category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      placeholder="e.g., Hair Care"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Input
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    placeholder="Brief product description"
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-sm font-medium">Barcode</Label>
                  <Input
                    id="barcode"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                    placeholder="Scan or enter barcode"
                    className="h-10"
                  />
                </div>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <div className="bg-green-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Pricing</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_price" className="text-sm font-medium">Cost Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cost_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProduct.cost_price}
                        onChange={(e) => setNewProduct({...newProduct, cost_price: e.target.value})}
                        placeholder="0.00"
                        className="h-10 pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retail_price" className="text-sm font-medium">Retail Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="retail_price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newProduct.retail_price}
                        onChange={(e) => setNewProduct({...newProduct, retail_price: e.target.value})}
                        placeholder="0.00"
                        className="h-10 pl-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="commission_rate" className="text-sm font-medium">Commission Rate (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newProduct.commission_rate}
                    onChange={(e) => setNewProduct({...newProduct, commission_rate: parseFloat(e.target.value) || 0})}
                    placeholder="10"
                    className="h-10 w-32"
                  />
                </div>
                </div>
              </div>
            </div>

            {/* Inventory Settings Section */}
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Inventory Settings</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm font-medium">Initial Stock</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={newProduct.quantity_on_hand}
                      onChange={(e) => setNewProduct({...newProduct, quantity_on_hand: parseInt(e.target.value) || 0})}
                      placeholder="0"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_point" className="text-sm font-medium">Reorder Point</Label>
                    <Input
                      id="reorder_point"
                      type="number"
                      min="0"
                      value={newProduct.reorder_point}
                      onChange={(e) => setNewProduct({...newProduct, reorder_point: parseInt(e.target.value) || 0})}
                      placeholder="5"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder_quantity" className="text-sm font-medium">Reorder Quantity</Label>
                  <Input
                    id="reorder_quantity"
                    type="number"
                    min="1"
                    value={newProduct.reorder_quantity}
                    onChange={(e) => setNewProduct({...newProduct, reorder_quantity: parseInt(e.target.value) || 1})}
                    placeholder="10"
                    className="h-10 w-32"
                  />
                </div>
                </div>
              </div>
            </div>

            {/* Optional Settings Section */}
            <div className="space-y-4">
              <div className="bg-purple-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900">Optional Settings</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product Image</Label>
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload">Upload Image</TabsTrigger>
                      <TabsTrigger value="url">Use URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-4">
                      <ImageUpload
                        onImageSelect={(url) => setNewProduct({...newProduct, image_url: url})}
                        onImageRemove={() => setNewProduct({...newProduct, image_url: ''})}
                        existingImage={newProduct.image_url}
                        maxSizeMB={5}
                      />
                    </TabsContent>
                    <TabsContent value="url" className="mt-4">
                      <Input
                        id="image_url"
                        value={newProduct.image_url}
                        onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                        placeholder="https://example.com/product-image.jpg"
                        className="h-10"
                      />
                      {newProduct.image_url && (
                        <div className="mt-3 p-3 border rounded bg-white">
                          <img 
                            src={newProduct.image_url} 
                            alt="Product preview" 
                            className="w-24 h-24 object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div className="hidden text-sm text-gray-500 italic">
                            Unable to load image preview
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Track Inventory Levels</Label>
                      <p className="text-xs text-muted-foreground">
                        Monitor stock quantities and movements
                      </p>
                    </div>
                    <Switch
                      checked={newProduct.track_inventory}
                      onCheckedChange={(checked) => setNewProduct({...newProduct, track_inventory: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Show in POS</Label>
                      <p className="text-xs text-muted-foreground">
                        Make available for sale in point-of-sale system
                      </p>
                    </div>
                    <Switch
                      checked={newProduct.show_in_pos}
                      onCheckedChange={(checked) => setNewProduct({...newProduct, show_in_pos: checked})}
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={closeAllModals} 
              disabled={addingProduct}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddProduct} 
              disabled={addingProduct || !newProduct.name || !newProduct.sku || !newProduct.retail_price}
              className="flex-1 sm:flex-none"
            >
              {addingProduct ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding Product...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={showEditProduct} onOpenChange={(open) => {
        if (!open) closeAllModals();
        else setShowEditProduct(open);
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Product</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update product details and inventory settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3 text-blue-900">Basic Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_name" className="text-sm font-medium">
                          Product Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit_name"
                          value={editingProduct?.name || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                          placeholder="e.g. Hair Gel"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_sku" className="text-sm font-medium">
                          SKU <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit_sku"
                          value={editingProduct?.sku || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, sku: e.target.value})}
                          placeholder="e.g. HG-001"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_description" className="text-sm font-medium">
                        Description
                      </Label>
                      <textarea
                        id="edit_description"
                        value={editingProduct?.description || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        placeholder="Product description..."
                        className="w-full px-3 py-2 border rounded-md min-h-[80px] text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3 text-green-900">Pricing</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_retail_price" className="text-sm font-medium">
                        Retail Price <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          id="edit_retail_price"
                          type="number"
                          value={editingProduct?.retail_price || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, retail_price: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                          step="0.01"
                          className="h-10 pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_cost_price" className="text-sm font-medium">
                        Cost Price
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          id="edit_cost_price"
                          type="number"
                          value={editingProduct?.cost_price || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, cost_price: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                          step="0.01"
                          className="h-10 pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_commission" className="text-sm font-medium">
                        Commission Rate %
                      </Label>
                      <Input
                        id="edit_commission"
                        type="number"
                        value={editingProduct?.commission_rate || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, commission_rate: parseFloat(e.target.value) || 0})}
                        placeholder="10"
                        step="0.1"
                        min="0"
                        max="100"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Settings Section */}
              <div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3 text-purple-900">Inventory Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_current_stock" className="text-sm font-medium">
                        Current Stock
                      </Label>
                      <Input
                        id="edit_current_stock"
                        type="number"
                        value={editingProduct?.current_stock || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, current_stock: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        min="0"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_low_stock" className="text-sm font-medium">
                        Low Stock Alert Level
                      </Label>
                      <Input
                        id="edit_low_stock"
                        type="number"
                        value={editingProduct?.low_stock_threshold || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, low_stock_threshold: parseInt(e.target.value) || 0})}
                        placeholder="5"
                        min="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Settings */}
              <div className="bg-orange-50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-orange-900 mb-3">Optional Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Track Inventory Levels</Label>
                      <p className="text-xs text-muted-foreground">
                        Monitor stock quantities and movements
                      </p>
                    </div>
                    <Switch
                      checked={editingProduct?.track_inventory || false}
                      onCheckedChange={(checked) => setEditingProduct({...editingProduct, track_inventory: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Show in POS</Label>
                      <p className="text-xs text-muted-foreground">
                        Make available for sale in point-of-sale system
                      </p>
                    </div>
                    <Switch
                      checked={editingProduct?.show_in_pos || false}
                      onCheckedChange={(checked) => setEditingProduct({...editingProduct, show_in_pos: checked})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={closeAllModals} 
              disabled={addingProduct}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditProduct} 
              disabled={addingProduct || !editingProduct?.name || !editingProduct?.sku || !editingProduct?.retail_price}
              className="flex-1 sm:flex-none"
            >
              {addingProduct ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
        if (!open) closeAllModals();
        else setShowDeleteConfirm(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Delete Product</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {productToDelete && (
            <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">
                    {productToDelete?.name}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    SKU: {productToDelete?.sku}
                  </p>
                  <p className="text-sm text-red-700">
                    Current Stock: {productToDelete?.quantity_on_hand || 0} units
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={closeAllModals}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteProduct}
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Bridge Selector */}
      {showPOSSelector && (
        <ProductBridgeSelector
          barbershopId={barbershopId}
          onClose={() => setShowPOSSelector(false)}
          onProductsAdded={handleProductsAdded}
        />
      )}
    </div>
  );
}