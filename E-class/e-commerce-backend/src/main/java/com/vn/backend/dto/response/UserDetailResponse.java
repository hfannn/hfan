package com.vn.backend.dto.response;

import com.vn.backend.entity.UserProfile;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UserDetailResponse {

    private Long id;
    private String username;
    private String email;
    private Long roleId;
    private Boolean isActive;
    private UserProfile userProfile;
}