package com.vn.backend.dto.response;

import com.vn.backend.entity.UserProfile;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UserDetailResponse {

    private Long id;
    private String username;
    private String email;

    private Long roleId;
    private String roleCode;
    private String roleName;

    private Boolean isActive;

    private String fullName;
    private String phone;
    private String address;
    private LocalDate birthday;

    private Double salary;

    private UserProfile userProfile;
}