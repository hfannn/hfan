package com.vn.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductUpdateRequest {

    @NotBlank(message = "Tên sản phẩm không được rỗng")
    private String name;

    private String code;

    @NotNull(message = "Thương hiệu không được rỗng")
    private Long brandId;

    @NotNull(message = "Danh mục không được rỗng")
    private Long categoryId;

    @NotNull(message = "Xuất xứ không được rỗng")
    private Long originId;

    @NotNull(message = "Nhà cung cấp không được rỗng")
    private Long supplierId;

    private String description;
    private Boolean isActive;
    private Long materialId;
}