package com.vn.backend.controller;

import com.vn.backend.dto.request.ProductCreateRequest;
import com.vn.backend.dto.request.ProductUpdateRequest;
import com.vn.backend.dto.response.PageResponse;
import com.vn.backend.dto.response.ProductCreatedResponse;
import com.vn.backend.dto.response.ProductDetailResponse;
import com.vn.backend.dto.response.ProductListResponse;
import com.vn.backend.entity.Product;
import com.vn.backend.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.math.BigDecimal;

@RestController
@RequestMapping("/v1/products")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<PageResponse<ProductListResponse>> getProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(
                productService.getProductList(page, size, categoryId, brandId, includeInactive)
        );
    }

    @GetMapping("/filter")
    public ResponseEntity<PageResponse<ProductListResponse>> filterProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) String sizeValue,
            @RequestParam(required = false, name = "variantSize") String sizeAlias,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String material,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) BigDecimal minSalePrice,
            @RequestParam(required = false) BigDecimal maxSalePrice,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Boolean isSale,
            @RequestParam(defaultValue = "false") boolean excludeSale,
            @RequestParam(defaultValue = "false") boolean excludePromotion,
            @RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) BigDecimal discountMin,
            @RequestParam(required = false) BigDecimal discountMax
    ) {
        String resolvedSize = sizeValue != null ? sizeValue : sizeAlias;
        BigDecimal resolvedMinPrice = minSalePrice != null ? minSalePrice : minPrice;
        BigDecimal resolvedMaxPrice = maxSalePrice != null ? maxSalePrice : maxPrice;
        return ResponseEntity.ok(productService.filterProducts(
                page,
                size,
                keyword,
                categoryId,
                brandId,
                resolvedSize,
                color,
                material,
                resolvedMinPrice,
                resolvedMaxPrice,
                sort,
                (excludeSale || excludePromotion) ? Boolean.FALSE : isSale,
                campaignId,
                discountMin,
                discountMax
        ));
    }

    @GetMapping("/promotions")
    public ResponseEntity<PageResponse<ProductListResponse>> getPromotionProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) BigDecimal minSalePrice,
            @RequestParam(required = false) BigDecimal maxSalePrice,
            @RequestParam(required = false) BigDecimal discountMin,
            @RequestParam(required = false) BigDecimal discountMax,
            @RequestParam(required = false) String sizeValue,
            @RequestParam(required = false, name = "variantSize") String sizeAlias,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) String material,
            @RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(productService.filterProducts(
                page,
                size,
                keyword,
                categoryId,
                brandId,
                sizeValue != null ? sizeValue : sizeAlias,
                color,
                material,
                minSalePrice,
                maxSalePrice,
                sort,
                Boolean.TRUE,
                campaignId,
                discountMin,
                discountMax
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> getProductDetail(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(productService.getProductDetail(id, includeInactive));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Product> create(@RequestBody @Valid ProductCreateRequest request) {
        Product product = productService.create(request);
        return ResponseEntity.ok(product);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductDetailResponse> update(
            @PathVariable Long id,
            @RequestBody @Valid ProductUpdateRequest request
    ) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/with-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductCreatedResponse> createWithImages(
            @RequestPart("data") @Valid ProductCreateRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) {
        Product product = productService.createWithImages(request, image, images);
        return ResponseEntity.ok(new ProductCreatedResponse(
                product.getId(), product.getId(), product.getCode(), product.getName()
        ));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadImage(@RequestPart("file") MultipartFile file) {
        String fileUrl = productService.uploadSingleImage(file);
        return ResponseEntity.ok(fileUrl);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
