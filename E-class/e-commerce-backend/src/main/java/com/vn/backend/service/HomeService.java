package com.vn.backend.service;

import com.vn.backend.dto.response.HomeProductResponse;
import com.vn.backend.dto.response.HomeResponse;

import java.util.List;

public interface HomeService {
    HomeResponse getHomeData(int limit);

    List<HomeProductResponse> getFeaturedProducts(int limit);

    List<HomeProductResponse> getPromotionProducts(int limit);

    List<HomeProductResponse> getBestSellers(int limit);
}
