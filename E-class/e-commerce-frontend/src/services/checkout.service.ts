import { axiosClient } from "./axiosClient";

export interface CheckoutQuoteItem {
  productId: number;
  variantId: number;
  productName: string;
  variantCode?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  imageUrl?: string | null;
  quantity: number;
  originalPrice: number;
  unitPrice: number;
  discountPercent: number;
  promotionId?: number | null;
  lineTotal: number;
}

export interface CheckoutQuoteResponse {
  items: CheckoutQuoteItem[];
  originalSubtotal: number;
  productDiscountTotal: number;
  subtotalBeforeVoucher: number;
  voucherDiscountAmount: number;
  shippingFee: number;
  productRevenue: number;
  finalTotal: number;
  voucherCode?: string | null;
  voucherValid?: boolean | null;
  voucherMessage?: string | null;
}

export interface CheckoutValidationIssue {
  type:
    | "PRODUCT_PRICE_CHANGED"
    | "PROMOTION_CHANGED"
    | "VOUCHER_CHANGED"
    | "VOUCHER_INVALID"
    | "OUT_OF_STOCK"
    | "PRODUCT_INACTIVE"
    | "VARIANT_INACTIVE";
  severity: "BLOCKING" | "REQUIRES_CONFIRMATION";
  productId?: number | null;
  variantId?: number | null;
  productName?: string | null;
  oldValue?: number | null;
  newValue?: number | null;
  message: string;
}

export interface CheckoutValidationResponse {
  status: "OK" | "BLOCKING" | "REQUIRES_CONFIRMATION";
  issues: CheckoutValidationIssue[];
  latestItems: CheckoutQuoteItem[];
  oldSubtotal: number;
  newSubtotal: number;
  oldDiscount: number;
  newDiscount: number;
  oldShippingFee: number;
  newShippingFee: number;
  oldTotal: number;
  newTotal: number;
}

export interface OldItemSnapshot {
  variantId: number;
  unitPrice: number;
  promotionId?: number | null;
}

export interface CheckoutValidationRequest {
  items: { variantId: number; quantity: number }[];
  voucherCode?: string | null;
  shippingInfo?: any;
  oldItems?: OldItemSnapshot[];
  oldSubtotal?: number;
  oldDiscount?: number;
  oldShippingFee?: number;
  oldTotal?: number;
}

export const checkoutService = {
  quote: (data: any) => {
    return axiosClient.post<CheckoutQuoteResponse>("/v1/checkout/quote", data);
  },

  validate: (data: CheckoutValidationRequest) => {
    return axiosClient.post<CheckoutValidationResponse>("/v1/checkout/validate", data);
  },
};
