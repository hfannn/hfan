package com.vn.backend.dto.request;

import jakarta.validation.constraints.*;
        import lombok.Data;

import java.time.LocalDate;

@Data
public class UserCreateRequest {

    // ===== USER (đăng nhập) =====
    @NotBlank
    @Size(min = 4, max = 50)
    private String username;

    @NotBlank
    @Size(min = 6)
    private String password;

    @NotBlank
    @Email
    private String email;

    @NotNull
    private Long roleId;


    // ===== USER PROFILE (thông tin cá nhân) =====
    @NotBlank
    private String fullName;

    @NotBlank
    private String phone;

    private String address;
    private LocalDate birthday;

    // ===== EMPLOYEE =====
    @NotNull
    @PositiveOrZero
    private Double salary;
}