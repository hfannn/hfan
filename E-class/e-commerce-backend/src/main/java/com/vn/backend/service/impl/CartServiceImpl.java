package com.vn.backend.service.impl;

import com.vn.backend.dto.request.AddCartRequest;
import com.vn.backend.dto.response.CartItemResponse;
import com.vn.backend.dto.response.CartResponse;
import com.vn.backend.dto.response.ProductPriceResponse;
import com.vn.backend.entity.AttributeValue;
import com.vn.backend.entity.Cart;
import com.vn.backend.entity.CartItem;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.ProductImage;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.User;
import com.vn.backend.entity.VariantAttributeValue;
import com.vn.backend.enums.CartStatus;
import com.vn.backend.repository.CartItemRepository;
import com.vn.backend.repository.CartRepository;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.service.CartService;
import com.vn.backend.service.ProductPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductPriceService productPriceService;

    @Override
    public CartResponse addToCart(Long userId, AddCartRequest request) {
        validateQuantity(request.getQuantity());

        Cart cart = getOrCreateActiveCart(userId);
        ProductVariant variant = getVariantOrThrow(request.getProductVariantId());

        validateVariantAvailable(variant);

        Optional<CartItem> existing =
                cartItemRepository.findByCartIdAndProductVariantId(cart.getId(), variant.getId());

        CartItem item;

        if (existing.isPresent()) {
            item = existing.get();
            int newQuantity = item.getQuantity() + request.getQuantity();

            if (newQuantity > safeStock(variant)) {
                throw new IllegalArgumentException("Số lượng vượt quá tồn kho");
            }

            item.setQuantity(newQuantity);
            item.setUpdatedAt(OffsetDateTime.now());
            applyCurrentPriceSnapshot(item, variant);
        } else {
            if (request.getQuantity() > safeStock(variant)) {
                throw new IllegalArgumentException("Số lượng vượt quá tồn kho");
            }

            item = new CartItem();
            item.setCart(cart);
            item.setProductVariant(variant);
            item.setQuantity(request.getQuantity());
            item.setCreatedAt(OffsetDateTime.now());
            applyCurrentPriceSnapshot(item, variant);
        }

        cartItemRepository.save(item);
        return mapToCartResponse(cart);
    }

    @Override
    public CartResponse getActiveCart(Long userId) {
        Cart cart = getOrCreateActiveCart(userId);
        return mapToCartResponse(cart);
    }

    @Override
    public CartResponse updateQuantity(Long userId, Long cartItemId, int quantity) {
        CartItem item = getCartItemOwnedByUser(userId, cartItemId);
        ProductVariant variant = item.getProductVariant();

        if (quantity <= 0) {
            cartItemRepository.delete(item);
            return mapToCartResponse(item.getCart());
        }

        validateVariantAvailable(variant);

        if (quantity > safeStock(variant)) {
            throw new IllegalArgumentException("Số lượng vượt quá tồn kho");
        }

        item.setQuantity(quantity);
        item.setUpdatedAt(OffsetDateTime.now());
        applyCurrentPriceSnapshot(item, variant);

        cartItemRepository.save(item);
        return mapToCartResponse(item.getCart());
    }

    @Override
    public CartResponse removeItem(Long userId, Long cartItemId) {
        CartItem item = getCartItemOwnedByUser(userId, cartItemId);
        Cart cart = item.getCart();

        cartItemRepository.delete(item);
        return mapToCartResponse(cart);
    }

    @Override
    public void clearCart(Long userId) {
        Customer customer = resolveCustomer(userId);

        Cart cart = cartRepository
                .findByCustomerIdAndStatus(customer.getId(), CartStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giỏ hàng đang hoạt động"));

        cartItemRepository.deleteAllByCartId(cart.getId());
    }

    private Cart getOrCreateActiveCart(Long userId) {
        Customer customer = resolveCustomer(userId);

        return cartRepository
                .findByCustomerIdAndStatus(customer.getId(), CartStatus.ACTIVE)
                .orElseGet(() -> createNewCart(customer));
    }

    private Cart createNewCart(Customer customer) {
        Cart cart = new Cart();
        cart.setCustomer(customer);
        cart.setStatus(CartStatus.ACTIVE);
        cart.setCreatedAt(OffsetDateTime.now());

        return cartRepository.save(cart);
    }

    private Customer resolveCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        return customerRepository
                .findByUserProfileId(user.getUserProfile().getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng"));
    }

    private ProductVariant getVariantOrThrow(Long variantId) {
        return productVariantRepository.findById(variantId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy biến thể sản phẩm"));
    }

    private CartItem getCartItemOwnedByUser(Long userId, Long cartItemId) {
        Customer customer = resolveCustomer(userId);

        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm trong giỏ hàng"));

        if (item.getCart() == null
                || item.getCart().getCustomer() == null
                || !item.getCart().getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("Bạn không có quyền thao tác giỏ hàng này");
        }

        return item;
    }

    private void validateVariantAvailable(ProductVariant variant) {
        if (variant == null) {
            throw new IllegalArgumentException("Sản phẩm không còn khả dụng");
        }

        if (!Boolean.TRUE.equals(variant.getIsActive()) || variant.getDeletedAt() != null) {
            throw new IllegalArgumentException("Biến thể sản phẩm đã ngừng bán");
        }

        if (variant.getProduct() == null
                || !Boolean.TRUE.equals(variant.getProduct().getIsActive())
                || variant.getProduct().getDeletedAt() != null) {
            throw new IllegalArgumentException("Sản phẩm đã ngừng bán");
        }

        if (safeStock(variant) <= 0) {
            throw new IllegalArgumentException("Sản phẩm đã hết hàng");
        }
    }

    private int safeStock(ProductVariant variant) {
        return variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
    }

    private void validateQuantity(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }
    }

    private String extractAttributeValue(ProductVariant variant, String attributeCode) {
        if (variant == null || variant.getVariantAttributeValues() == null) {
            return null;
        }

        return variant.getVariantAttributeValues().stream()
                .map(VariantAttributeValue::getAttributeValue)
                .filter(attributeValue -> attributeValue != null
                        && attributeValue.getAttribute() != null
                        && attributeValue.getAttribute().getCode() != null
                        && attributeCode.equalsIgnoreCase(attributeValue.getAttribute().getCode()))
                .map(AttributeValue::getValue)
                .findFirst()
                .orElse(null);
    }

    private CartResponse mapToCartResponse(Cart cart) {
        CartResponse resp = new CartResponse();
        resp.setCartId(cart.getId());
        resp.setCustomerId(cart.getCustomer().getId());
        resp.setStatus(cart.getStatus().name());

        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal originalSubtotal = BigDecimal.ZERO;
        BigDecimal productDiscountTotal = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        int totalItems = 0;

        List<CartItem> items = cartItemRepository.findByCartIdOrderByIdAsc(cart.getId());

        for (CartItem item : items) {
            ProductVariant variant = item.getProductVariant();

            String imageUrl = null;
            if (variant.getImages() != null) {
                imageUrl = variant.getImages().stream()
                        .filter(productImage -> Boolean.TRUE.equals(productImage.getIsPrimary()))
                        .findFirst()
                        .or(() -> variant.getImages().stream().findFirst())
                        .map(ProductImage::getImageUrl)
                        .orElse(null);
            }

            String size = extractAttributeValue(variant, "SIZE");
            String color = extractAttributeValue(variant, "COLOR");
            String materialName = (variant.getProduct() != null && variant.getProduct().getMaterial() != null)
                    ? variant.getProduct().getMaterial().getValue()
                    : null;
            String material = materialName;

            ProductPriceResponse priceSnapshot = applyCurrentPriceSnapshot(item, variant);

            BigDecimal originalPrice = defaultZero(item.getOriginalPrice());
            BigDecimal unitPrice = defaultZero(item.getUnitPrice());
            BigDecimal discountPercent = defaultZero(item.getDiscountPercent());
            BigDecimal subTotal = defaultZero(item.getLineTotal());
            BigDecimal itemOriginalSubtotal = originalPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

            CartItemResponse itemResp = new CartItemResponse();
            itemResp.setCartItemId(item.getId());
            itemResp.setProductId(variant.getProduct().getId());
            itemResp.setVariantId(variant.getId());
            itemResp.setProductName(variant.getProduct().getName());
            itemResp.setVariantCode(variant.getCode());
            itemResp.setSize(size);
            itemResp.setColor(color);
            itemResp.setMaterial(materialName);
            itemResp.setMaterialName(materialName);
            itemResp.setPrice(unitPrice);
            itemResp.setOriginalPrice(originalPrice);
            itemResp.setUnitPrice(unitPrice);
            itemResp.setSalePrice(unitPrice);
            itemResp.setDiscountPercent(discountPercent);
            itemResp.setPromotionId(item.getPromotionId());
            itemResp.setPromotionName(priceSnapshot.getPromotionName());
            itemResp.setIsSale(item.getPromotionId() != null && discountPercent.compareTo(BigDecimal.ZERO) > 0);
            itemResp.setQuantity(item.getQuantity());
            itemResp.setStockRemaining(variant.getStockQuantity());
            itemResp.setSubTotal(subTotal);
            itemResp.setLineTotal(subTotal);
            itemResp.setImageUrl(imageUrl);
            itemResp.setVariantActive(Boolean.TRUE.equals(variant.getIsActive()) && variant.getDeletedAt() == null);
            itemResp.setProductActive(variant.getProduct() != null
                    && Boolean.TRUE.equals(variant.getProduct().getIsActive())
                    && variant.getProduct().getDeletedAt() == null);

            originalSubtotal = originalSubtotal.add(itemOriginalSubtotal);
            productDiscountTotal = productDiscountTotal.add(itemOriginalSubtotal.subtract(subTotal));
            totalAmount = totalAmount.add(subTotal);
            totalItems += item.getQuantity();

            itemResponses.add(itemResp);
        }

        resp.setItems(itemResponses);
        resp.setOriginalSubtotal(originalSubtotal);
        resp.setProductDiscountTotal(productDiscountTotal);
        resp.setSubtotalBeforeVoucher(totalAmount);
        resp.setTotalAmount(totalAmount);
        resp.setTotalItems(totalItems);

        return resp;
    }

    private ProductPriceResponse applyCurrentPriceSnapshot(CartItem item, ProductVariant variant) {
        ProductPriceResponse price = productPriceService.calculateCurrentPrice(variant);
        BigDecimal originalPrice = defaultZero(price.getOriginalPrice());
        BigDecimal unitPrice = defaultZero(price.getUnitPrice());
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

        item.setOriginalPrice(originalPrice);
        item.setUnitPrice(unitPrice);
        item.setDiscountPercent(defaultZero(price.getDiscountPercent()));
        item.setPromotionId(price.getPromotionId());
        item.setLineTotal(lineTotal);
        return price;
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
