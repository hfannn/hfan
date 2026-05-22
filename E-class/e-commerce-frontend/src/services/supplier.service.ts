import { axiosClient } from "./axiosClient";

export interface Supplier {
  id: number;
  code: string;
  name: string;
  phone?: string;
  isActive?: boolean;
}

export interface SupplierRequest {
  code: string;
  name: string;
  phone?: string;
}

export const supplierService = {
  getAll() {
    return axiosClient.get<Supplier[]>("/v1/suppliers");
  },

  create(data: SupplierRequest) {
    return axiosClient.post<Supplier>("/v1/suppliers", data);
  },

  update(id: number, data: SupplierRequest) {
    return axiosClient.put<Supplier>(`/v1/suppliers/${id}`, data);
  },

  remove(id: number) {
    return axiosClient.delete(`/v1/suppliers/${id}`);
  },
};
