package com.vn.backend.service;

import com.vn.backend.dto.request.LoginRequest;
import com.vn.backend.dto.request.RegisterRequest;
import com.vn.backend.dto.response.LoginResponse;
import com.vn.backend.entity.Customer;
import com.vn.backend.entity.Role;
import com.vn.backend.entity.User;
import com.vn.backend.entity.UserProfile;
import com.vn.backend.repository.CustomerRepository;
import com.vn.backend.repository.RoleRepository;
import com.vn.backend.repository.UserProfileRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final CustomerRepository customerRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is disabled");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Wrong password");
        }

        String roleCode = user.getRole().getCode();
        String token = jwtUtil.generateToken(user.getUsername(), roleCode);

        return new LoginResponse(
                token,
                user.getId(),
                user.getUsername(),
                roleCode
        );
    }
    @Transactional
    public void register(RegisterRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();

        String phone = request.getPhone() == null
                ? null
                : request.getPhone().trim();

        if (phone != null && phone.isBlank()) {
            phone = null;
        }

        String address = request.getAddress() == null
                ? null
                : request.getAddress().trim();

        if (phone != null && phone.isBlank()) {
            phone = null;
        }

        if (address != null && address.isBlank()) {
            address = null;
        }

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username đã tồn tại");
        }

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã tồn tại");
        }

        if (phone != null && userProfileRepository.existsByPhone(phone)) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        Role customerRole = roleRepository.findByCode("CUSTOMER")
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role CUSTOMER"));

        UserProfile profile = new UserProfile();
        profile.setFullName(request.getFullName().trim());
        profile.setPhone(phone);
        profile.setAddress(request.getAddress());
        profile.setBirthday(request.getBirthday());
        profile.setIsActive(true);

        UserProfile savedProfile = userProfileRepository.save(profile);

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setIsActive(true);
        user.setRole(customerRole);
        user.setUserProfile(savedProfile);

        userRepository.save(user);

        Customer customer = Customer.builder()
                .userProfile(savedProfile)
                .code(generateCustomerCode())
                .loyaltyPoints(0)
                .customerType("RETAIL")
                .build();

        customerRepository.save(customer);
    }

    private String generateCustomerCode() {
        return customerRepository.findTopByOrderByIdDesc()
                .map(Customer::getCode)
                .map(code -> {
                    String numberPart = code.replaceAll("\\D+", "");
                    int number = numberPart.isBlank() ? 0 : Integer.parseInt(numberPart);
                    return String.format("KH%04d", number + 1);
                })
                .orElse("KH0001");
    }
}
