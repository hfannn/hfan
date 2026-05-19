package com.vn.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ShippingInfoRequest {
    @NotBlank(message = "Vui lòng nhập họ tên.")
    @Size(min = 2, max = 100, message = "Họ tên không hợp lệ.")
    @Pattern(
            regexp = "^(?!\\d+$)(?!.*[<>{}\\[\\]])(?!.*(?i:script)).+$",
            message = "Họ tên không hợp lệ."
    )
    private String customerName;

    @NotBlank(message = "Vui lòng nhập số điện thoại.")
    @Pattern(regexp = "^(0)(3|5|7|8|9)[0-9]{8}$", message = "Số điện thoại không hợp lệ.")
    private String phone;

    @NotBlank(message = "Vui lòng nhập địa chỉ chi tiết.")
    @Size(min = 5, max = 255, message = "Địa chỉ chi tiết không hợp lệ.")
    @Pattern(
            regexp = "^(?!\\d+$)(?!.*[<>])(?!.*(?i:script)).+$",
            message = "Địa chỉ chi tiết không hợp lệ."
    )
    private String address;

    @Size(max = 255, message = "Ghi chú giao hàng không hợp lệ.")
    @Pattern(regexp = "^(?!.*[<>])(?!.*(?i:script)).*$", message = "Ghi chú giao hàng không hợp lệ.")
    private String note;

    private String province;
    private String district;
    private String ward;
    private Integer provinceId;
    private Integer districtId;
    private String wardCode;
    private String provinceName;
    private String districtName;
    private String wardName;
    private Integer shippingFee;
}
