import { axiosClient } from './axiosClient';

export interface CouponRequest {
  code: string;
  discountType: 'PERCENTAGE' | 'PERCENT' | 'FIXED_AMOUNT' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export const couponService = {
  getAll: (params?: any) => {
    return axiosClient.get('/v1/coupons', { params });
  },

  getMyCoupons: () => {
    return axiosClient.get('/v1/coupons/my-coupons');
  },

  create: (data: CouponRequest) => {
    return axiosClient.post('/v1/coupons', data);
  },

  update: (id: number, data: CouponRequest) => {
    return axiosClient.put(`/v1/coupons/${id}`, data);
  },

  delete: (id: number) => {
    return axiosClient.delete(`/v1/coupons/${id}`);
  },
};
