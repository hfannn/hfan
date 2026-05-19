package com.vn.backend.controller;

import com.vn.backend.dto.response.HomeProductResponse;
import com.vn.backend.dto.response.HomeResponse;
import com.vn.backend.service.HomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/home")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class HomeController {

    private final HomeService homeService;

    @GetMapping
    public ResponseEntity<HomeResponse> getHome(@RequestParam(defaultValue = "4") int limit) {
        return ResponseEntity.ok(homeService.getHomeData(limit));
    }

    @GetMapping("/featured-products")
    public ResponseEntity<List<HomeProductResponse>> getFeaturedProducts(
            @RequestParam(defaultValue = "4") int limit
    ) {
        return ResponseEntity.ok(homeService.getFeaturedProducts(limit));
    }

    @GetMapping("/promotion-products")
    public ResponseEntity<List<HomeProductResponse>> getPromotionProducts(
            @RequestParam(defaultValue = "4") int limit
    ) {
        return ResponseEntity.ok(homeService.getPromotionProducts(limit));
    }

    @GetMapping("/best-sellers")
    public ResponseEntity<List<HomeProductResponse>> getBestSellers(
            @RequestParam(defaultValue = "4") int limit
    ) {
        return ResponseEntity.ok(homeService.getBestSellers(limit));
    }
}
