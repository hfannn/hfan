package com.vn.backend.controller;

import com.vn.backend.dto.request.ProductVariantCreateRequest;
import com.vn.backend.dto.request.ProductVariantUpdateRequest;
import com.vn.backend.dto.request.VariantBulkRequest;
import com.vn.backend.dto.response.ProductVariantResponse;
import com.vn.backend.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/product-variants")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class ProductVariantController {

    private final ProductVariantService productVariantService;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ProductVariantResponse> create(
            @RequestBody @Valid ProductVariantCreateRequest request
    ) {
        return ResponseEntity.ok(productVariantService.create(request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/bulk")
    public ResponseEntity<List<ProductVariantResponse>> createBulk(
            @RequestBody @Valid VariantBulkRequest request
    ) {
        return ResponseEntity.ok(productVariantService.createBulk(request));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ProductVariantResponse>> getByProductId(@PathVariable Long productId) {
        return ResponseEntity.ok(productVariantService.getByProductId(productId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductVariantResponse> updateVariant(
            @PathVariable Long id,
            @RequestBody @Valid ProductVariantUpdateRequest request
    ) {
        return ResponseEntity.ok(productVariantService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVariant(@PathVariable Long id) {
        productVariantService.delete(id);
        return ResponseEntity.noContent().build();
    }
}