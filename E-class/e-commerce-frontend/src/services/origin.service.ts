import { axiosClient } from "./axiosClient";

export interface Origin {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface OriginRequest {
  name: string;
}

export const originService = {
  getAll() {
    return axiosClient.get<Origin[]>("/v1/origins");
  },

  create(data: OriginRequest) {
    return axiosClient.post<Origin>("/v1/origins", data);
  },

  update(id: number, data: OriginRequest) {
    return axiosClient.put<Origin>(`/v1/origins/${id}`, data);
  },

  remove(id: number) {
    return axiosClient.delete(`/v1/origins/${id}`);
  },
};
