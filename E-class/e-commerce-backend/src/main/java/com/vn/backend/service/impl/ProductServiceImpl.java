package com.vn.backend.service.impl;

import com.vn.backend.dto.request.ProductCreateRequest;
import com.vn.backend.dto.request.ProductUpdateRequest;
import com.vn.backend.dto.response.PageResponse;
import com.vn.backend.dto.response.ProductDetailResponse;
import com.vn.backend.dto.response.ProductListResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.dto.response.ProductVariantResponse;
import com.vn.backend.entity.AttributeValue;
import com.vn.backend.entity.Brand;
import com.vn.backend.entity.Category;
import com.vn.backend.entity.Origin;
import com.vn.backend.entity.Product;
import com.vn.backend.entity.ProductImage;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.Supplier;
import com.vn.backend.mapper.PageMapper;
import com.vn.backend.repository.AttributeValueRepository;
import com.vn.backend.repository.BrandRepository;
import com.vn.backend.repository.CategoryRepository;
import com.vn.backend.repository.OriginRepository;
import com.vn.backend.repository.ProductImageRepository;
import com.vn.backend.repository.ProductRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.SupplierRepository;
import com.vn.backend.service.FileStorageService;
import com.vn.backend.service.ProductPriceService;
import com.vn.backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final OriginRepository originRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductVariantRepository productVariantRepository;
    private final FileStorageService fileStorageService;
    private final SupplierRepository supplierRepository;
    private final ProductPriceService productPriceService;
    private final AttributeValueRepository attributeValueRepository;

    @Override
    @Transactional
    public Product create(ProductCreateRequest request) {
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));

        Origin origin = originRepository.findById(request.getOriginId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xuất xứ"));

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhà cung cấp"));

        String resolvedCode = resolveProductCode(request);

        Product product = new Product();
        product.setName(request.getName().trim());
        product.setCode(resolvedCode);
        product.setDescription(request.getDescription());
        product.setBrand(brand);
        product.setCategory(category);
        product.setOrigin(origin);
        product.setSupplier(supplier);
        product.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        product.setDeletedAt(null);

        if (request.getMaterialId() != null) {
            AttributeValue material = attributeValueRepository.findById(request.getMaterialId())
                    .orElseThrow(() -> new RuntimeException("Khong tim thay chat lieu"));
            product.setMaterial(material);
        }

        return productRepository.save(product);
    }

    @Override
    @Transactional
    public ProductDetailResponse update(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + productId));

        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));

        Origin origin = originRepository.findById(request.getOriginId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xuất xứ"));

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhà cung cấp"));

        product.setName(request.getName().trim());
        product.setDescription(request.getDescription());
        product.setBrand(brand);
        product.setCategory(category);
        product.setOrigin(origin);
        product.setSupplier(supplier);
        product.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        if (request.getMaterialId() != null) {
            AttributeValue material = attributeValueRepository.findById(request.getMaterialId())
                    .orElseThrow(() -> new RuntimeException("Khong tim thay chat lieu"));
            product.setMaterial(material);
        } else {
            product.setMaterial(null);
        }

        if (StringUtils.hasText(request.getCode())) {
            String normalizedCode = normalizeCode(request.getCode());

            if (!StringUtils.hasText(normalizedCode)) {
                throw new RuntimeException("Mã sản phẩm không hợp lệ");
            }

            boolean duplicated = productRepository.existsByCodeAndDeletedAtIsNullAndIdNot(
                    normalizedCode,
                    productId
            );

            if (duplicated) {
                throw new RuntimeException("Mã sản phẩm đã tồn tại");
            }

            product.setCode(normalizedCode);
        }

        productRepository.saveAndFlush(product);

        return getProductDetail(productId, true);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductListResponse> getProductList(
            int page,
            int size,
            Long categoryId,
            Long brandId,
            boolean includeInactive
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductListResponse> pageData = productRepository.findProductList(
                pageable,
                categoryId,
                brandId,
                includeInactive
        );
        return PageMapper.toPageResponse(pageData, dto -> dto);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductListResponse> filterProducts(
            int page,
            int size,
            String keyword,
            Long categoryId,
            Long brandId,
            String sizeValue,
            String color,
            String material,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String sort,
            Boolean isSale,
            Long campaignId,
            BigDecimal discountMin,
            BigDecimal discountMax
    ) {
        Pageable pageable = PageRequest.of(page, size, resolveSort(sort));
        Page<Product> pageData = productRepository.filterProducts(
                pageable,
                StringUtils.hasText(keyword) ? "%" + keyword.trim().toLowerCase() + "%" : null,
                categoryId,
                brandId,
                StringUtils.hasText(sizeValue) ? sizeValue.trim().toLowerCase() : null,
                StringUtils.hasText(color) ? color.trim().toLowerCase() : null,
                StringUtils.hasText(material) ? material.trim().toLowerCase() : null,
                minPrice,
                maxPrice,
                isSale,
                campaignId,
                discountMin,
                discountMax,
                OffsetDateTime.now()
        );
        PageResponse<ProductListResponse> response =
                PageMapper.toPageResponse(pageData, this::mapProductToSaleAwareListResponse);
        response.setContent(sortProductListResponse(response.getContent(), sort));
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDetailResponse getProductDetail(Long id, boolean includeInactive) {
        Product p = productRepository.findDetailById(id, includeInactive)
                .orElseThrow(() -> new RuntimeException("PRODUCT_NOT_FOUND"));

        List<ProductVariant> productVariants = productVariantRepository.findByProductIdWithAttributes(id);

        List<ProductVariantResponse> variants = productVariants == null
                ? List.of()
                : productVariants.stream()
                .filter(v -> v.getDeletedAt() == null)
                .filter(v -> includeInactive || Boolean.TRUE.equals(v.getIsActive()))
                .map(this::mapVariantToSaleAwareResponse)
                .toList();

        List<String> images = p.getImages() == null
                ? List.of()
                : p.getImages().stream()
                .sorted(java.util.Comparator
                        .comparing((ProductImage img) -> Boolean.TRUE.equals(img.getIsPrimary()) ? 0 : 1)
                        .thenComparing(ProductImage::getDisplayOrder, java.util.Comparator.nullsLast(Integer::compareTo)))
                .map(ProductImage::getImageUrl)
                .toList();

        return new ProductDetailResponse(
                p.getId(),
                p.getCode(),
                p.getName(),
                p.getDescription(),

                p.getBrand() != null ? p.getBrand().getId() : null,
                p.getBrand() != null ? p.getBrand().getName() : null,

                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,

                p.getOrigin() != null ? p.getOrigin().getId() : null,
                p.getOrigin() != null ? p.getOrigin().getName() : null,

                p.getSupplier() != null ? p.getSupplier().getId() : null,
                p.getSupplier() != null ? p.getSupplier().getName() : null,

                p.getMaterial() != null ? p.getMaterial().getId() : null,
                p.getMaterial() != null ? p.getMaterial().getValue() : null,

                p.getIsActive(),
                p.getDeletedAt(),
                variants,
                images
        );
    }

    @Override
    @Transactional
    public Product createWithImages(
            ProductCreateRequest request,
            MultipartFile primaryImage,
            List<MultipartFile> galleryImages
    ) {
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục"));

        Origin origin = originRepository.findById(request.getOriginId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy xuất xứ"));

        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhà cung cấp"));

        Product product = new Product();
        product.setName(request.getName().trim());
        product.setCode(resolveProductCode(request));
        product.setDescription(request.getDescription());
        product.setBrand(brand);
        product.setCategory(category);
        product.setOrigin(origin);
        product.setSupplier(supplier);
        product.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        product.setDeletedAt(null);

        if (request.getMaterialId() != null) {
            AttributeValue material = attributeValueRepository.findById(request.getMaterialId())
                    .orElseThrow(() -> new RuntimeException("Khong tim thay chat lieu"));
            product.setMaterial(material);
        }

        product = productRepository.save(product);

        int order = 0;

        if (primaryImage != null && !primaryImage.isEmpty()) {
            String url = fileStorageService.store(primaryImage);

            ProductImage img = new ProductImage();
            img.setProduct(product);
            img.setImageUrl(url);
            img.setIsPrimary(true);
            img.setDisplayOrder(order++);
            productImageRepository.save(img);
        }

        if (galleryImages != null) {
            for (MultipartFile file : galleryImages) {
                if (file == null || file.isEmpty()) {
                    continue;
                }

                String url = fileStorageService.store(file);

                ProductImage img = new ProductImage();
                img.setProduct(product);
                img.setImageUrl(url);
                img.setIsPrimary(false);
                img.setDisplayOrder(order++);
                productImageRepository.save(img);
            }
        }

        return product;
    }

    @Override
    public String uploadSingleImage(MultipartFile file) {
        return fileStorageService.store(file);
    }

    @Override
    @Transactional
    public void deleteProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm với ID: " + productId));

        if (product.getDeletedAt() != null) {
            throw new RuntimeException("Sản phẩm đã bị xóa trước đó.");
        }

        product.setDeletedAt(OffsetDateTime.now());
        productRepository.save(product);

        productVariantRepository.findByProductId(productId).forEach(variant -> {
            if (variant.getDeletedAt() == null) {
                variant.setDeletedAt(OffsetDateTime.now());
                productVariantRepository.save(variant);
            }
        });
    }

    private String resolveProductCode(ProductCreateRequest request) {
        if (StringUtils.hasText(request.getCode())) {
            return ensureUniqueProductCode(normalizeCode(request.getCode()));
        }

        String base = normalizeCode(request.getName());

        if (!StringUtils.hasText(base)) {
            base = "SAN-PHAM";
        }

        return ensureUniqueProductCode(base);
    }

    private String ensureUniqueProductCode(String baseCode) {
        String candidate = baseCode;
        int counter = 1;

        while (productRepository.existsByCodeAndDeletedAtIsNull(candidate)) {
            candidate = baseCode + "-" + String.format("%02d", counter++);
        }

        return candidate;
    }

    private String normalizeCode(String input) {
        if (!StringUtils.hasText(input)) {
            return "";
        }

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D")
                .trim()
                .toUpperCase()
                .replaceAll("[^A-Z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");

        return normalized.length() > 30 ? normalized.substring(0, 30) : normalized;
    }

    private Sort resolveSort(String sort) {
        return Sort.by(Sort.Direction.DESC, "id");
    }

    private List<ProductListResponse> sortProductListResponse(
            List<ProductListResponse> content,
            String sort
    ) {
        List<ProductListResponse> sorted = new ArrayList<>(content);
        if ("priceAsc".equalsIgnoreCase(sort) || "price_asc".equalsIgnoreCase(sort)) {
            sorted.sort(Comparator.comparing(item -> nullSafePrice(item.getMinSalePrice())));
        } else if ("priceDesc".equalsIgnoreCase(sort) || "price_desc".equalsIgnoreCase(sort)) {
            sorted.sort(Comparator.comparing(
                    (ProductListResponse item) -> nullSafePrice(item.getMinSalePrice())
            ).reversed());
        } else if ("discountDesc".equalsIgnoreCase(sort) || "discount_desc".equalsIgnoreCase(sort)) {
            sorted.sort(Comparator.comparing(
                    (ProductListResponse item) -> nullSafePrice(item.getDiscountPercent())
            ).reversed());
        }
        return sorted;
    }

    private BigDecimal nullSafePrice(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private ProductListResponse mapProductToSaleAwareListResponse(Product product) {
        List<ProductVariant> activeVariants = product.getVariants() == null
                ? List.of()
                : product.getVariants().stream()
                .filter(v -> v.getDeletedAt() == null)
                .filter(v -> Boolean.TRUE.equals(v.getIsActive()))
                .toList();

        BigDecimal minOriginal = null;
        BigDecimal maxOriginal = null;
        BigDecimal minSale = null;
        BigDecimal maxSale = null;
        BigDecimal discountPercent = null;
        int totalStock = 0;
        int saleVariantCount = 0;

        for (ProductVariant variant : activeVariants) {
            ProductPriceResponse currentPrice = productPriceService.calculateCurrentPrice(variant);
            BigDecimal original = currentPrice.getOriginalPrice();
            if (original == null) {
                continue;
            }
            totalStock += variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            minOriginal = min(minOriginal, original);
            maxOriginal = max(maxOriginal, original);

            BigDecimal finalPrice = currentPrice.getUnitPrice();
            if (Boolean.TRUE.equals(currentPrice.getIsSale())) {
                discountPercent = max(discountPercent, currentPrice.getDiscountPercent());
                saleVariantCount++;
            }
            minSale = min(minSale, finalPrice);
            maxSale = max(maxSale, finalPrice);
        }

        ProductListResponse response = new ProductListResponse();
        response.setId(product.getId());
        response.setCode(product.getCode());
        response.setName(product.getName());
        response.setBrandName(product.getBrand() != null ? product.getBrand().getName() : null);
        response.setCategoryName(product.getCategory() != null ? product.getCategory().getName() : null);
        response.setImageUrl(product.getImages() == null || product.getImages().isEmpty()
                ? null
                : product.getImages().stream()
                .sorted(Comparator.comparing((ProductImage img) -> Boolean.TRUE.equals(img.getIsPrimary()) ? 0 : 1)
                        .thenComparing(ProductImage::getDisplayOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(ProductImage::getImageUrl)
                .findFirst()
                .orElse(null));
        response.setTotalStock(totalStock);
        response.setMinOriginalPrice(minOriginal);
        response.setMaxOriginalPrice(maxOriginal);
        response.setMinPrice(minSale);
        response.setMaxPrice(maxSale);
        response.setSalePrice(minSale);
        response.setMinSalePrice(minSale);
        response.setMaxSalePrice(maxSale);
        response.setDiscountPercent(discountPercent);
        response.setIsSale(discountPercent != null && discountPercent.compareTo(BigDecimal.ZERO) > 0);
        response.setSaleVariantCount(saleVariantCount);
        response.setActiveVariantCount(activeVariants.size());
        response.setIsActive(product.getIsActive());
        return response;
    }

    public ProductListResponse mapProductForPublicCard(Product product) {
        return mapProductToSaleAwareListResponse(product);
    }

    private ProductVariantResponse mapVariantToSaleAwareResponse(ProductVariant variant) {
        ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);

        ProductVariantResponse response = new ProductVariantResponse(
                variant.getId(),
                variant.getCode(),
                variant.getBarcode(),
                variant.getCostPrice(),
                variant.getSellingPrice(),
                variant.getStockQuantity(),
                variant.getBinLocation(),
                variant.getIsActive(),
                variant.getVariantAttributeValues() == null
                        ? java.util.Collections.emptyMap()
                        : variant.getVariantAttributeValues().stream()
                        .collect(java.util.stream.Collectors.toMap(
                                av -> av.getAttributeValue().getAttribute().getCode(),
                                av -> av.getAttributeValue().getValue(),
                                (oldVal, newVal) -> oldVal
                        ))
        );

        response.setOriginalPrice(price.getOriginalPrice());
        response.setUnitPrice(price.getUnitPrice());
        response.setSalePrice(price.getSalePrice());
        response.setDiscountPercent(price.getDiscountPercent());
        response.setIsSale(price.getIsSale());
        response.setPromotionId(price.getPromotionId());
        response.setPromotionName(price.getPromotionName());
        return response;
    }

    private BigDecimal min(BigDecimal current, BigDecimal candidate) {
        if (candidate == null) {
            return current;
        }
        return current == null || candidate.compareTo(current) < 0 ? candidate : current;
    }

    private BigDecimal max(BigDecimal current, BigDecimal candidate) {
        if (candidate == null) {
            return current;
        }
        return current == null || candidate.compareTo(current) > 0 ? candidate : current;
    }
}
