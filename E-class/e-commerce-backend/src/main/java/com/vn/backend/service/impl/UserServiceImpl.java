package com.vn.backend.service.impl;

import com.vn.backend.dto.request.UpdateUserRequest;
import com.vn.backend.dto.request.UpdateUserStatusRequest;
import com.vn.backend.dto.request.UserCreateRequest;
import com.vn.backend.dto.response.PageResponse;
import com.vn.backend.dto.response.UserDetailResponse;
import com.vn.backend.dto.response.UserResponse;
import com.vn.backend.entity.Employee;
import com.vn.backend.entity.Role;
import com.vn.backend.entity.User;
import com.vn.backend.entity.UserProfile;
import com.vn.backend.mapper.PageMapper;
import com.vn.backend.repository.EmployeeRepository;
import com.vn.backend.repository.RoleRepository;
import com.vn.backend.repository.UserProfileRepository;
import com.vn.backend.repository.UserRepository;
import com.vn.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final String ROLE_CUSTOMER = "CUSTOMER";

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAllUserDTO();
    }

    @Override
    public PageResponse<UserResponse> getUsersPage(
            int page,
            int size,
            String keyword
    ) {
        Pageable pageable = PageRequest.of(page, size);

        Page<UserResponse> result = userRepository.findUserPage(
                keyword == null || keyword.isBlank() ? null : keyword,
                pageable
        );

        return PageMapper.toPageResponse(result, u -> u);
    }

    @Transactional
    @Override
    public void createUser(UserCreateRequest req) {

        if (req.getPhone() != null && profileRepository.existsByPhone(req.getPhone())) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        if (userRepository.existsByUsername(req.getUsername())) {
            throw new RuntimeException("Username đã tồn tại");
        }

        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        Role role = roleRepository.findById(req.getRoleId())
                .orElseThrow(() -> new RuntimeException("ROLE_NOT_FOUND"));

        boolean isCustomerRole = role.getCode() != null
                && ROLE_CUSTOMER.equalsIgnoreCase(role.getCode());

        if (!isCustomerRole) {
            if (req.getSalary() == null || req.getSalary() < 0) {
                throw new RuntimeException("Lương không hợp lệ");
            }
        }

        UserProfile profile = new UserProfile();
        profile.setFullName(req.getFullName());
        profile.setPhone(req.getPhone());
        profile.setAddress(req.getAddress());
        profile.setBirthday(req.getBirthday());
        profile.setIsActive(true);

        profileRepository.save(profile);

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setIsActive(true);
        user.setRole(role);
        user.setUserProfile(profile);

        userRepository.save(user);

        if (!isCustomerRole) {
            Employee employee = new Employee();
            employee.setUserProfile(profile);
            employee.setCode(generateEmployeeCode());
            employee.setRole(role);
            employee.setSalary(req.getSalary());
            employee.setIsActive(true);

            employeeRepository.save(employee);
        }
    }

    @Override
    public void updateStatus(Long id, UpdateUserStatusRequest request) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        user.setIsActive(request.getIsActive());

        if (user.getUserProfile() != null) {
            Optional<Employee> employeeOpt =
                    employeeRepository.findByUserProfile(user.getUserProfile());

            employeeOpt.ifPresent(employee -> {
                employee.setIsActive(request.getIsActive());
                employeeRepository.save(employee);
            });
        }

        userRepository.save(user);
    }

    @Transactional
    @Override
    public void deleteUser(Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        if (user.getDeletedAt() != null) {
            throw new RuntimeException("USER_ALREADY_DELETED");
        }

        user.setDeletedAt(OffsetDateTime.now());
    }

    @Transactional
    @Override
    public void restoreUser(Long id) {

        User user = userRepository.findByIdIncludingDeleted(id)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        if (user.getDeletedAt() == null) {
            throw new RuntimeException("USER_NOT_DELETED");
        }

        user.setDeletedAt(null);
    }

    @Transactional
    @Override
    public void updateUser(Long id, UpdateUserRequest request) {

        User user = userRepository.findDetailById(id)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        UserProfile profile = user.getUserProfile();

        if (profile == null) {
            throw new RuntimeException("USER_PROFILE_NOT_FOUND");
        }

        Employee employee = employeeRepository
                .findByUserProfile(profile)
                .orElse(null);

        if (request.getEmail() != null) {
            String email = request.getEmail().trim().toLowerCase();

            if (userRepository.existsByEmail(email)
                    && !email.equalsIgnoreCase(user.getEmail())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Email đã tồn tại"
                );
            }

            user.setEmail(email);
        }

        Role selectedRole = user.getRole();

        if (request.getRoleId() != null) {
            selectedRole = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new RuntimeException("ROLE_NOT_FOUND"));

            user.setRole(selectedRole);
        }

        if (request.getFullName() != null) {
            profile.setFullName(request.getFullName());
        }

        if (request.getPhone() != null) {
            String phone = request.getPhone().trim();

            if (profileRepository.existsByPhone(phone)
                    && !phone.equals(profile.getPhone())) {
                throw new RuntimeException("Số điện thoại đã tồn tại");
            }

            profile.setPhone(phone);
        }

        if (request.getAddress() != null) {
            profile.setAddress(request.getAddress());
        }

        if (request.getBirthday() != null) {
            profile.setBirthday(request.getBirthday());
        }

        boolean isCustomerRole = selectedRole != null
                && selectedRole.getCode() != null
                && ROLE_CUSTOMER.equalsIgnoreCase(selectedRole.getCode());

        if (isCustomerRole) {
            if (employee != null) {
                employee.setIsActive(false);
                employeeRepository.save(employee);
            }

            userRepository.save(user);
            return;
        }

        if (employee == null) {
            employee = new Employee();
            employee.setUserProfile(profile);
            employee.setCode(generateEmployeeCode());
            employee.setIsActive(Boolean.TRUE.equals(user.getIsActive()));
        }

        employee.setRole(selectedRole);

        if (request.getSalary() != null) {
            if (request.getSalary() < 0) {
                throw new RuntimeException("Lương không hợp lệ");
            }

            employee.setSalary(request.getSalary());
        } else if (employee.getSalary() == null) {
            employee.setSalary(0D);
        }

        employeeRepository.save(employee);
        userRepository.save(user);
    }

    @Override
    public UserDetailResponse getUserById(Long id) {

        User user = userRepository.findDetailById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

        UserProfile profile = user.getUserProfile();

        Employee employee = null;

        if (profile != null) {
            employee = employeeRepository.findByUserProfile(profile)
                    .orElse(null);
        }

        UserDetailResponse res = new UserDetailResponse();

        res.setId(user.getId());
        res.setUsername(user.getUsername());
        res.setEmail(user.getEmail());
        res.setIsActive(user.getIsActive());

        if (user.getRole() != null) {
            res.setRoleId(user.getRole().getId());
            res.setRoleCode(user.getRole().getCode());
            res.setRoleName(user.getRole().getName());
        }

        res.setUserProfile(profile);

        if (profile != null) {
            res.setFullName(profile.getFullName());
            res.setPhone(profile.getPhone());
            res.setAddress(profile.getAddress());
            res.setBirthday(profile.getBirthday());
        }

        if (employee != null) {
            res.setSalary(employee.getSalary());
        }

        return res;
    }

    private String generateEmployeeCode() {
        Optional<Employee> lastEmployeeOpt = employeeRepository.findTopByOrderByIdDesc();

        if (lastEmployeeOpt.isEmpty()) {
            return "NV00001";
        }

        Employee lastEmployee = lastEmployeeOpt.get();
        String lastCode = lastEmployee.getCode();

        if (lastCode == null || !lastCode.startsWith("NV")) {
            return "NV00001";
        }

        int number = Integer.parseInt(lastCode.substring(2));
        number++;

        return String.format("NV%05d", number);
    }
}