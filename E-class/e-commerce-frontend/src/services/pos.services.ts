import { axiosClient } from "./axiosClient";

export interface PosOrderItemResponse {
  itemId: number;
  productVariantId: number;
  variantCode: string;
  barcode: string;
  productName: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  stockQuantity: number;
  imageUrl?: string | null;
}

export interface PosOrderResponse {
  orderId: number;
  orderCode: string;
  status: string;
  customerId?: number | null;
  customerName?: string | null;
  employeeId?: number | null;
  storeId?: number | null;
  totalAmount: number;
  discountAmount: number;
  voucherCode?: string | null;
  finalAmount: number;
  customerPaid: number;
  changeAmount: number;
  orderType?: string | null;
  note?: string | null;
  items: PosOrderItemResponse[];
}

export interface PosProductSearchResponse {
  productId: number;
  productVariantId: number;
  variantCode: string;
  barcode: string;
  productCode: string;
  productName: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  sellingPrice: number;
  originalPrice?: number | null;
  salePrice?: number | null;
  finalPrice?: number | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  promotionId?: number | null;
  stockQuantity: number;
  inStock?: boolean | null;
  imageUrl?: string | null;
}

export interface PosAvailableDiscountResponse {
  voucherType: "PROMOTION" | "COUPON";
  id: number;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscountAmount?: number | null;
  issuedQuantity?: number | null;
  usedCount?: number | null;
  remainingCount?: number | null;
  remainingUses?: number | null;
  usedPercent?: number | null;
  remainingPercent?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  estimatedDiscountAmount: number;
  eligible?: boolean | null;
  ineligibleReason?: string | null;
  bestVoucher: boolean;
  isBest?: boolean | null;
}

export interface PosCreateOrderRequest {
  employeeId: number;
  customerId?: number | null;
  storeId: number;
  note?: string;
}

export interface PosAddItemRequest {
  productVariantId: number;
  quantity: number;
}

export interface PosUpdateItemRequest {
  quantity: number;
}

export interface PosAssignCustomerRequest {
  customerId: number | null;
}

export interface PosQuickCreateCustomerRequest {
  fullName: string;
  phone: string;
  address?: string;
}

export interface PosCheckoutRequest {
  paymentMethodId: number;
  customerPaid: number;
  couponId?: number | null;
  promotionId?: number | null;
  note?: string;
}

export interface PosVnpayCreateResponse {
  orderId: number;
  orderCode: string;
  paymentUrl: string;
  txnRef: string;
}

export interface PosVnpayReturnResponse {
  success: boolean;
  message: string;
  txnRef?: string;
  transactionNo?: string;
  responseCode?: string;
  orderId?: number;
}

const POS_BASE = "/v1/pos";

export const posService = {
  createOrder: async (
    payload: PosCreateOrderRequest,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.post(`${POS_BASE}/orders`, payload);
    return res.data;
  },

  getDraftOrders: async (): Promise<PosOrderResponse[]> => {
    const res = await axiosClient.get(`${POS_BASE}/orders/drafts`);
    return res.data;
  },

  getOrderDetail: async (orderId: number): Promise<PosOrderResponse> => {
    const res = await axiosClient.get(`${POS_BASE}/orders/${orderId}`);
    return res.data;
  },

  getAvailableDiscounts: async (
    orderId: number,
  ): Promise<PosAvailableDiscountResponse[]> => {
    const res = await axiosClient.get(
      `${POS_BASE}/orders/${orderId}/discounts/available`,
    );
    return res.data;
  },

  searchProducts: async (
    keyword: string,
  ): Promise<PosProductSearchResponse[]> => {
    const res = await axiosClient.get(`${POS_BASE}/products/search`, {
      params: { keyword },
    });
    return res.data;
  },

  getProductByBarcode: async (
    barcode: string,
  ): Promise<PosProductSearchResponse> => {
    const res = await axiosClient.get(
      `${POS_BASE}/products/barcode/${barcode}`,
    );
    return res.data;
  },

  addItem: async (
    orderId: number,
    payload: PosAddItemRequest,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.post(
      `${POS_BASE}/orders/${orderId}/items`,
      payload,
    );
    return res.data;
  },

  updateItem: async (
    orderId: number,
    itemId: number,
    payload: PosUpdateItemRequest,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.put(
      `${POS_BASE}/orders/${orderId}/items/${itemId}`,
      payload,
    );
    return res.data;
  },

  removeItem: async (
    orderId: number,
    itemId: number,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.delete(
      `${POS_BASE}/orders/${orderId}/items/${itemId}`,
    );
    return res.data;
  },

  assignCustomer: async (
    orderId: number,
    payload: PosAssignCustomerRequest,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.put(
      `${POS_BASE}/orders/${orderId}/customer`,
      payload,
    );
    return res.data;
  },

  quickCreateCustomerAndAssign: async (
    orderId: number,
    payload: PosQuickCreateCustomerRequest,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.post(
      `${POS_BASE}/orders/${orderId}/customer/quick-create`,
      payload,
    );
    return res.data;
  },

  checkout: async (
    orderId: number,
    payload: PosCheckoutRequest,
  ): Promise<PosOrderResponse> => {
    const res = await axiosClient.post(
      `${POS_BASE}/orders/${orderId}/checkout`,
      payload,
    );
    return res.data;
  },

  cancelOrder: async (orderId: number): Promise<string> => {
    const res = await axiosClient.post(`${POS_BASE}/orders/${orderId}/cancel`);
    return res.data;
  },

  createVnpayPayment: async (
    orderId: number,
    payload: PosCheckoutRequest,
  ): Promise<PosVnpayCreateResponse> => {
    const res = await axiosClient.post(
      `${POS_BASE}/orders/${orderId}/checkout/vnpay`,
      payload,
    );
    return res.data;
  },

  getVnpayReturnResult: async (
    params: Record<string, string>,
  ): Promise<PosVnpayReturnResponse> => {
    const res = await axiosClient.get(`${POS_BASE}/vnpay/return`, { params });
    return res.data;
  },
};
