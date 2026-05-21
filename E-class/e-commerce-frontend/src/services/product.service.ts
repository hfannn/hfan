import { axiosClient } from "./axiosClient";

export interface ProductUpdatePayload {
  name: string;
  code?: string | null;
  description?: string | null;
  brandId: number;
  categoryId: number;
  originId: number;
  supplierId: number;
  materialId?: number | null;
  isActive?: boolean;
}

export interface ProductVariantUpdatePayload {
  code?: string | null;
  costPrice?: number;
  sellingPrice?: number;
  stockQuantity?: number;
  isActive?: boolean;
  attributeValueIds?: number[];
}

export const productService = {
  getHome: (limit = 4) => {
    return axiosClient.get("/v1/home", { params: { limit } });
  },

  getHomeFeaturedProducts: (limit = 4) => {
    return axiosClient.get("/v1/home/featured-products", { params: { limit } });
  },

  getHomePromotionProducts: (limit = 4) => {
    return axiosClient.get("/v1/home/promotion-products", { params: { limit } });
  },

  getHomeBestSellers: (limit = 4) => {
    return axiosClient.get("/v1/home/best-sellers", { params: { limit } });
  },

  getProducts: (params?: any) => {
    return axiosClient.get("/v1/products", { params });
  },

  filterProducts: (params?: any) => {
    return axiosClient.get("/v1/products/filter", { params });
  },

  getPromotionProducts: (params?: any) => {
    return axiosClient.get("/v1/products/promotions", { params });
  },

  getProductById: (productId: number, includeInactive = false) => {
    return axiosClient.get(`/v1/products/${productId}`, {
      params: {
        includeInactive,
      },
    });
  },

  getBrands: () => {
    return axiosClient.get("/v1/brands");
  },

  getCategories: () => {
    return axiosClient.get("/v1/categories");
  },

  getOrigins: () => {
    return axiosClient.get("/v1/origins");
  },

  getSuppliers: () => {
    return axiosClient.get("/v1/suppliers");
  },

  getAttributes: () => {
    return axiosClient.get("/v1/attributes");
  },

  getColors: () => {
    return axiosClient.get("/v1/attributes/color/values");
  },

  getSizes: () => {
    return axiosClient.get("/v1/attributes/size/values");
  },

  getMaterials: () => {
    return axiosClient.get("/v1/attributes/material/values");
  },

  createProductWithImages: (formData: FormData) => {
    return axiosClient.post("/v1/products/with-images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  updateProduct: (productId: number, payload: ProductUpdatePayload) => {
    return axiosClient.put(`/v1/products/${productId}`, payload);
  },

  uploadImage: (formData: FormData) => {
    return axiosClient.post("/v1/products/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  bulkCreateVariantsOnly: (payload: { productId: number; variants: any[] }) => {
    return axiosClient.post("/v1/product-variants/bulk", payload);
  },

  bulkCreateVariants: (productId: number, variants: any[]) => {
    const formData = new FormData();

    const variantsJson = variants.map((variant) => {
      const { variantImages, ...rest } = variant;
      return rest;
    });

    formData.append(
      "data",
      new Blob([JSON.stringify({ productId, variants: variantsJson })], {
        type: "application/json",
      }),
    );

    variants.forEach((variant) => {
      if (
        variant.variantImages &&
        variant.variantImages.length > 0 &&
        variant.variantImages[0].originFileObj
      ) {
        formData.append("images", variant.variantImages[0].originFileObj);
      }
    });

    return axiosClient.post("/v1/product-variants/bulk", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  updateVariant: (variantId: number, payload: ProductVariantUpdatePayload) => {
    return axiosClient.put(`/v1/product-variants/${variantId}`, payload);
  },

  deleteProduct: (productId: number) => {
    return axiosClient.delete(`/v1/products/${productId}`);
  },

  deleteVariant: (variantId: number) => {
    return axiosClient.delete(`/v1/product-variants/${variantId}`);
  },
};
