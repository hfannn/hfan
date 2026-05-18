package com.vn.backend.service.impl;

import com.vn.backend.dto.request.ProductVariantCreateRequest;
import com.vn.backend.dto.request.ProductVariantUpdateRequest;
import com.vn.backend.dto.request.VariantBulkRequest;
import com.vn.backend.dto.response.ProductVariantResponse;
import com.vn.backend.entity.AttributeValue;
import com.vn.backend.entity.Product;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.VariantAttributeValue;
import com.vn.backend.entity.VariantAttributeValueId;
import com.vn.backend.exception.ConflictException;
import com.vn.backend.repository.AttributeValueRepository;
import com.vn.backend.repository.ProductRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.VariantAttributeValueRepository;
import com.vn.backend.service.ProductVariantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductVariantServiceImpl implements ProductVariantService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final AttributeValueRepository attributeValueRepository;
    private final VariantAttributeValueRepository variantAttributeValueRepository;

    @Override
    public ProductVariantResponse create(ProductVariantCreateRequest request) {
        return createInternal(
                request.getProductId(),
                request.getCode(),
                request.getBarcode(),
                request.getCostPrice(),
                request.getSellingPrice(),
                request.getStockQuantity(),
                request.getBinLocation(),
                request.getIsActive(),
                request.getAttributeValueIds()
        );
    }

    @Override
    public List<ProductVariantResponse> createBulk(VariantBulkRequest request) {
        List<ProductVariantResponse> result = new ArrayList<>();

        for (VariantBulkRequest.VariantItemRequest item : request.getVariants()) {
            result.add(
                    createInternal(
                            request.getProductId(),
                            item.getCode(),
                            item.getBarcode(),
                            item.getCostPrice(),
                            item.getSellingPrice(),
                            item.getStockQuantity(),
                            item.getBinLocation(),
                            true,
                            item.getAttributeValueIds()
                    )
            );
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductVariantResponse> getByProductId(Long productId) {
        return productVariantRepository.findByProductIdWithAttributes(productId)
                .stream()
                .filter(v -> v.getDeletedAt() == null)
                .map(this::toResponseFromEntity)
                .toList();
    }

    @Override
    public ProductVariantResponse update(Long variantId, ProductVariantUpdateRequest request) {
        ProductVariant variant = productVariantRepository.findByIdWithAttributes(variantId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy biến thể với ID: " + variantId));

        if (variant.getDeletedAt() != null) {
            throw new RuntimeException("Biến thể đã bị xóa trước đó");
        }

        if (StringUtils.hasText(request.getCode())) {
            String normalizedCode = normalizeCode(request.getCode());

            if (!StringUtils.hasText(normalizedCode)) {
                throw new RuntimeException("Mã biến thể không hợp lệ");
            }

            boolean duplicated = productVariantRepository.existsByCodeAndDeletedAtIsNullAndIdNot(
                    normalizedCode,
                    variantId
            );

            if (duplicated) {
                throw new RuntimeException("Mã biến thể đã tồn tại");
            }

            variant.setCode(normalizedCode);
        }

        if (request.getBarcode() != null) {
            String trimmedBarcode = request.getBarcode().trim();

            if (trimmedBarcode.isBlank()) {
                variant.setBarcode(null);
            } else {
                boolean duplicatedBarcode = productVariantRepository.existsByBarcodeAndDeletedAtIsNullAndIdNot(
                        trimmedBarcode,
                        variantId
                );

                if (duplicatedBarcode) {
                    throw new RuntimeException("Barcode đã tồn tại");
                }

                variant.setBarcode(trimmedBarcode);
            }
        }

        if (request.getCostPrice() != null) {
            validateMoney(request.getCostPrice(), "Giá nhập");
            variant.setCostPrice(request.getCostPrice());
        }

        if (request.getSellingPrice() != null) {
            validateMoney(request.getSellingPrice(), "Giá bán");
            variant.setSellingPrice(request.getSellingPrice());
        }

        if (request.getStockQuantity() != null) {
            if (request.getStockQuantity() < 0) {
                throw new RuntimeException("Tồn kho không được nhỏ hơn 0");
            }

            variant.setStockQuantity(request.getStockQuantity());
        }

        if (request.getBinLocation() != null) {
            variant.setBinLocation(
                    request.getBinLocation().trim().isBlank()
                            ? null
                            : request.getBinLocation().trim()
            );
        }

        if (request.getIsActive() != null) {
            variant.setIsActive(request.getIsActive());
        }

        if (request.getAttributeValueIds() != null) {
            updateVariantAttributes(variant, request.getAttributeValueIds());
        }

        ProductVariant saved = productVariantRepository.saveAndFlush(variant);

        ProductVariant reloaded = productVariantRepository.findByIdWithAttributes(saved.getId())
                .orElse(saved);

        return toResponseFromEntity(reloaded);
    }

    @Override
    public void delete(Long variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy biến thể với ID: " + variantId));

        if (variant.getDeletedAt() != null) {
            throw new RuntimeException("Biến thể đã bị xóa trước đó.");
        }

        variant.setDeletedAt(OffsetDateTime.now());
        productVariantRepository.save(variant);
    }

    private ProductVariantResponse createInternal(
            Long productId,
            String code,
            String barcode,
            BigDecimal costPrice,
            BigDecimal sellingPrice,
            Integer stockQuantity,
            String binLocation,
            Boolean isActive,
            List<Long> attributeValueIds
    ) {
        if (costPrice == null || sellingPrice == null) {
            throw new RuntimeException("Giá nhập và giá bán không được để trống");
        }

        validateMoney(costPrice, "Giá nhập");
        validateMoney(sellingPrice, "Giá bán");

        Product product = productRepository.findByIdAndDeletedAtIsNull(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        String trimmedBarcode = null;

        if (barcode != null && !barcode.isBlank()) {
            trimmedBarcode = barcode.trim();

            if (productVariantRepository.existsByBarcodeAndDeletedAtIsNull(trimmedBarcode)) {
                throw new RuntimeException("Barcode đã tồn tại");
            }
        }

        List<AttributeValue> attributeValues = getValidAttributeValues(attributeValueIds);
        validateNoDuplicateAttributeType(attributeValues);
        validateDuplicateCombination(productId, attributeValues, null);

        String resolvedCode = resolveVariantCode(product, code, attributeValues);

        if (productVariantRepository.existsByCodeAndDeletedAtIsNull(resolvedCode)) {
            throw new RuntimeException("Mã biến thể đã tồn tại");
        }

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setCode(resolvedCode);
        variant.setBarcode(trimmedBarcode);
        variant.setCostPrice(costPrice);
        variant.setSellingPrice(sellingPrice);
        variant.setStockQuantity(stockQuantity == null ? 0 : stockQuantity);
        variant.setBinLocation(binLocation);
        variant.setIsActive(isActive != null ? isActive : true);
        variant.setDeletedAt(null);

        variant = productVariantRepository.saveAndFlush(variant);

        for (AttributeValue av : attributeValues) {
            VariantAttributeValue link = new VariantAttributeValue();
            link.setId(new VariantAttributeValueId(variant.getId(), av.getId()));
            link.setVariant(variant);
            link.setAttributeValue(av);
            variantAttributeValueRepository.saveAndFlush(link);
        }

        return toResponseFromCreatedData(variant, attributeValues);
    }

    private void updateVariantAttributes(ProductVariant variant, List<Long> attributeValueIds) {
        List<AttributeValue> attributeValues = getValidAttributeValues(attributeValueIds);
        validateNoDuplicateAttributeType(attributeValues);
        validateDuplicateCombination(variant.getProduct().getId(), attributeValues, variant.getId());

        variantAttributeValueRepository.deleteByVariantId(variant.getId());

        if (variant.getVariantAttributeValues() != null) {
            variant.getVariantAttributeValues().clear();
        }

        productVariantRepository.saveAndFlush(variant);

        for (AttributeValue av : attributeValues) {
            VariantAttributeValue link = new VariantAttributeValue();
            link.setId(new VariantAttributeValueId(variant.getId(), av.getId()));
            link.setVariant(variant);
            link.setAttributeValue(av);
            variantAttributeValueRepository.saveAndFlush(link);
        }
    }

    private List<AttributeValue> getValidAttributeValues(List<Long> attributeValueIds) {
        if (attributeValueIds == null || attributeValueIds.isEmpty()) {
            throw new RuntimeException("Biến thể phải có ít nhất 1 thuộc tính");
        }

        List<Long> distinctAttributeValueIds = new ArrayList<>(new LinkedHashSet<>(attributeValueIds));

        if (distinctAttributeValueIds.size() != attributeValueIds.size()) {
            throw new RuntimeException("Danh sách thuộc tính đang bị trùng");
        }

        List<AttributeValue> attributeValues = attributeValueRepository.findAllById(distinctAttributeValueIds);

        if (attributeValues.size() != distinctAttributeValueIds.size()) {
            throw new RuntimeException("Có thuộc tính không tồn tại");
        }

        return attributeValues;
    }

    private void validateMoney(BigDecimal value, String fieldName) {
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(fieldName + " phải lớn hơn hoặc bằng 0");
        }
    }

    private void validateNoDuplicateAttributeType(List<AttributeValue> attributeValues) {
        Map<String, Long> counts = attributeValues.stream()
                .collect(Collectors.groupingBy(
                        av -> av.getAttribute().getCode().toUpperCase(),
                        Collectors.counting()
                ));

        boolean hasDuplicateType = counts.values().stream().anyMatch(count -> count > 1);

        if (hasDuplicateType) {
            throw new RuntimeException("Một biến thể không được chứa 2 giá trị cùng loại thuộc tính");
        }
    }

    private void validateDuplicateCombination(
            Long productId,
            List<AttributeValue> newValues,
            Long excludedVariantId
    ) {
        List<Long> attributeValueIds = newValues.stream()
                .map(AttributeValue::getId)
                .sorted()
                .toList();

        boolean duplicated = !productVariantRepository
                .findDuplicateVariantIdsByAttributeValueIds(
                        productId,
                        attributeValueIds,
                        attributeValueIds.size(),
                        excludedVariantId
                )
                .isEmpty();

        if (duplicated) {
            throw new ConflictException("Biến thể này đã tồn tại.");
        }
    }

    private ProductVariantResponse toResponseFromCreatedData(
            ProductVariant variant,
            List<AttributeValue> attributeValues
    ) {
        Map<String, String> attributes = attributeValues == null
                ? Collections.emptyMap()
                : attributeValues.stream()
                .collect(Collectors.toMap(
                        av -> av.getAttribute().getCode(),
                        AttributeValue::getValue,
                        (oldVal, newVal) -> oldVal,
                        LinkedHashMap::new
                ));

        return new ProductVariantResponse(
                variant.getId(),
                variant.getCode(),
                variant.getBarcode(),
                variant.getCostPrice(),
                variant.getSellingPrice(),
                variant.getStockQuantity(),
                variant.getBinLocation(),
                variant.getIsActive(),
                attributes
        );
    }

    private ProductVariantResponse toResponseFromEntity(ProductVariant variant) {
        Map<String, String> attributes = variant.getVariantAttributeValues() == null
                ? Collections.emptyMap()
                : variant.getVariantAttributeValues().stream()
                .collect(Collectors.toMap(
                        v -> v.getAttributeValue().getAttribute().getCode(),
                        v -> v.getAttributeValue().getValue(),
                        (oldVal, newVal) -> oldVal,
                        LinkedHashMap::new
                ));

        return new ProductVariantResponse(
                variant.getId(),
                variant.getCode(),
                variant.getBarcode(),
                variant.getCostPrice(),
                variant.getSellingPrice(),
                variant.getStockQuantity(),
                variant.getBinLocation(),
                variant.getIsActive(),
                attributes
        );
    }

    private String resolveVariantCode(
            Product product,
            String requestedCode,
            List<AttributeValue> attributeValues
    ) {
        if (StringUtils.hasText(requestedCode)) {
            return ensureUniqueVariantCode(normalizeCode(requestedCode));
        }

        String color = attributeValues.stream()
                .filter(av -> "COLOR".equalsIgnoreCase(av.getAttribute().getCode()))
                .map(AttributeValue::getValue)
                .findFirst()
                .orElse("COLOR");

        String size = attributeValues.stream()
                .filter(av -> "SIZE".equalsIgnoreCase(av.getAttribute().getCode()))
                .map(AttributeValue::getValue)
                .findFirst()
                .orElse("SIZE");

        String baseCode = normalizeCode(product.getCode() + "-" + color + "-" + size);

        return ensureUniqueVariantCode(baseCode);
    }

    private String ensureUniqueVariantCode(String baseCode) {
        String candidate = baseCode;
        int counter = 1;

        while (productVariantRepository.existsByCodeAndDeletedAtIsNull(candidate)) {
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

        return normalized.length() > 50 ? normalized.substring(0, 50) : normalized;
    }
}
