package com.vn.backend.dto.request.pos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PosQuickCreateCustomerRequest {

    @NotBlank(message = "Vui lòng nhập họ tên.")
    @Size(min = 2, max = 100, message = "Họ tên không hợp lệ.")
    @Pattern(
            regexp = "^(?!\\d+$)(?!.*[<>{}\\[\\]])(?!.*(?i:script)).+$",
            message = "Họ tên không hợp lệ."
    )
    private String fullName;

    @NotBlank(message = "Vui lòng nhập số điện thoại.")
    @Pattern(regexp = "^(0)(3|5|7|8|9)[0-9]{8}$", message = "Số điện thoại không hợp lệ.")
    private String phone;

    @Size(max = 255, message = "Địa chỉ chi tiết không hợp lệ.")
    @Pattern(
            regexp = "^(|(?=.{5,255}$)(?!\\d+$)(?!.*[<>])(?!.*(?i:script)).*)$",
            message = "Địa chỉ chi tiết không hợp lệ."
    )
    private String address;
}
