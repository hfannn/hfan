package com.vn.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductCreatedResponse {
    private Long id;
    private Long productId;
    private String code;
    private String name;
}
