package com.vn.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddCartRequest {

    @NotNull(message = "Vui lòng chọn khách hàng.")
    private Long customerId;

    @NotNull(message = "Vui lòng chọn biến thể sản phẩm.")
    private Long productVariantId;

    @Min(value = 1, message = "Số lượng phải lớn hơn 0.")
    private Integer quantity;
}
