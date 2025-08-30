'use client';

import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  Package,
  DollarSign,
  ChevronRight,
  Star,
  Info,
  Truck,
  Shield,
  Award,
  ShoppingBag,
  Eye,
  Heart,
  Share2,
  BarChart3
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '../../hooks/use-toast';
import { Badge } from '../ui/badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs.jsx';

export function MarketplaceBrowser({ barberbarbershopId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({ categories: [], brands: [] });
  const [enrollment, setEnrollment] = useState(null);
  const [cart, setCart] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCatalog();
  }, [barberbarbershopId, page, searchTerm, selectedCategory, selectedBrand, sortBy]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        barberbarbershop_id: barberbarbershopId,
        page: page.toString(),
        limit: '12',
        sort_by: sortBy
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedBrand !== 'all') params.append('brand', selectedBrand);

      const response = await fetch(`/api/marketplace/catalog?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
        setPagination(data.pagination || {});
        setFilters(data.filters || { categories: [], brands: [] });
        setEnrollment(data.enrollment);
      } else {
        throw new Error(data.error || 'Failed to load catalog');
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

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

    toast({
      title: "Added to cart",
      description: `${product.name} added to your order`,
    });
  };

  const importToInventory = async (product) => {
    try {
      const response = await fetch('/api/marketplace/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberbarbershop_id: barberbarbershopId,
          master_product_id: product.id,
          initial_quantity: 0,
          retail_price: product.msrp,
          show_in_pos: true,
          auto_reorder: false
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Product Imported",
          description: `${product.name} added to your inventory`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calculateSavings = (product, quantity = 1) => {
    const regularPrice = product.wholesale_price * quantity;
    const yourPrice = product.your_price * quantity;
    
    // Apply bulk pricing if applicable
    if (product.bulk_pricing && product.bulk_pricing.length > 0) {
      const applicableTier = product.bulk_pricing
        .filter(tier => quantity >= tier.min_quantity)
        .sort((a, b) => b.min_quantity - a.min_quantity)[0];
      
      if (applicableTier) {
        return {
          amount: regularPrice - (applicableTier.unit_price * quantity),
          percent: applicableTier.discount_percent
        };
      }
    }
    
    return {
      amount: regularPrice - yourPrice,
      percent: product.tier_discount || 0
    };
  };

  const getEnrollmentBadge = () => {
    if (!enrollment || !enrollment.is_enrolled) {
      return { label: 'Not Enrolled', variant: 'secondary' };
    }
    
    switch (enrollment.discount_tier) {
      case 'platinum':
        return { label: 'Platinum Member', variant: 'default', icon: Award };
      case 'gold':
        return { label: 'Gold Member', variant: 'warning', icon: Star };
      case 'silver':
        return { label: 'Silver Member', variant: 'secondary', icon: Shield };
      default:
        return { label: 'Standard Member', variant: 'outline', icon: ShoppingBag };
    }
  };

  const enrollmentBadge = getEnrollmentBadge();

  return (
    <div className="space-y-6">
      {/* Header with Enrollment Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">BookedBarber Marketplace</h2>
          <p className="text-muted-foreground">
            Wholesale products for your barbershop
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={enrollmentBadge.variant} className="px-3 py-1">
            {enrollmentBadge.icon && <enrollmentBadge.icon className="h-3 w-3 mr-2" />}
            {enrollmentBadge.label}
          </Badge>
          <Button variant="outline" size="sm">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Cart ({cart.length})
          </Button>
        </div>
      </div>

      {/* Promotional Banner */}
      {enrollment?.tier_discount > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold">You're saving {enrollment.tier_discount}% on every order!</p>
                  <p className="text-sm text-muted-foreground">
                    As a {enrollment.discount_tier} member, you get exclusive pricing
                  </p>
                </div>
              </div>
              <Button size="sm" variant="secondary">
                View Benefits
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative md:col-span-2">
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
              {filters.categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Brands</option>
              {filters.brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="featured">Featured</option>
              <option value="name">Name (A-Z)</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Product Grid */}
      <div className={`grid gap-4 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
          : 'grid-cols-1'
      }`}>
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Product Image */}
            {product.image_url && (
              <div className="relative aspect-square">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.is_new && (
                  <Badge className="absolute top-2 left-2">New</Badge>
                )}
                {product.is_featured && (
                  <Badge className="absolute top-2 right-2" variant="secondary">Featured</Badge>
                )}
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {product.brand} • SKU: {product.sku}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Price:</span>
                  <span className="text-xl font-bold">${product.your_price.toFixed(2)}</span>
                </div>
                {product.tier_discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Regular:</span>
                    <span className="line-through">${product.wholesale_price.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">MSRP:</span>
                  <span>${product.msrp.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Potential Profit:</span>
                  <span className="font-medium">
                    ${product.estimated_profit.toFixed(2)} ({product.profit_margin}%)
                  </span>
                </div>
              </div>

              {/* Stock Status */}
              <div className="flex items-center justify-between">
                <Badge variant={product.in_stock ? 'default' : 'destructive'}>
                  {product.stock_status.message}
                </Badge>
                {product.warehouse_inventory?.lead_time_days && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {product.warehouse_inventory.lead_time_days} days
                  </span>
                )}
              </div>

              {/* Bulk Pricing */}
              {product.bulk_pricing && product.bulk_pricing.length > 0 && (
                <div className="border rounded-md p-2 bg-muted/50">
                  <p className="text-xs font-medium mb-1">Bulk Discounts:</p>
                  <div className="space-y-1">
                    {product.bulk_pricing.slice(0, 2).map(tier => (
                      <div key={tier.min_quantity} className="text-xs flex justify-between">
                        <span>Buy {tier.min_quantity}+</span>
                        <span className="font-medium text-green-600">
                          Save {tier.discount_percent}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => importToInventory(product)}
              >
                <Package className="h-4 w-4 mr-1" />
                Import
              </Button>
              <Button
                size="sm"
                onClick={() => addToCart(product)}
                disabled={!product.in_stock}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.total_pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search term
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}