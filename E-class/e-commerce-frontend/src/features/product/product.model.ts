export interface ProductList {
  id: number;
  code: string;
  name: string;
  brandName: string;
  categoryName: string;
  minPrice: number;
  maxPrice: number;
  minOriginalPrice?: number;
  maxOriginalPrice?: number;
  salePrice?: number;
  minSalePrice?: number;
  maxSalePrice?: number;
  discountPercent?: number;
  isSale?: boolean;
  saleVariantCount?: number;
  activeVariantCount?: number;
  totalStock: number;
  imageUrl: string;
}

export interface HomeProduct {
  productId: number;
  name: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  soldQuantity?: number;
  isPromotionActive?: boolean;
}

export interface HomeResponse {
  featuredProducts: HomeProduct[];
  promotionProducts: HomeProduct[];
  bestSellerProducts: HomeProduct[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
