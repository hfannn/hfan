package com.vn.backend.controller;

import com.vn.backend.dto.request.ProductImageCreateRequest;
import com.vn.backend.service.ProductImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/product-images")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor

public class ProductImageController {

    private final ProductImageService productImageService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody ProductImageCreateRequest request) {
        productImageService.create(request);
        return ResponseEntity.ok().build();
    }
}