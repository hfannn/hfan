package com.vn.backend.repository;

import com.vn.backend.dto.response.UserResponse;
import com.vn.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    @Query("""
        SELECT new com.vn.backend.dto.response.UserResponse(
            u.id,
            u.username,
            u.email,
            r.code,
            up.fullName,
            u.isActive
        )
        FROM User u
        JOIN u.role r
        LEFT JOIN u.userProfile up
        WHERE u.deletedAt IS NULL
    """)
    List<UserResponse> findAllUserDTO();

    @Query("""
        SELECT new com.vn.backend.dto.response.UserResponse(
            u.id,
            u.username,
            u.email,
            r.code,
            up.fullName,
            u.isActive
        )
        FROM User u
        JOIN u.role r
        LEFT JOIN u.userProfile up
        WHERE u.deletedAt IS NULL
          AND (
            :keyword IS NULL
            OR u.username LIKE %:keyword%
            OR u.email LIKE %:keyword%
            OR up.fullName LIKE %:keyword%
          )
    """)
    Page<UserResponse> findUserPage(String keyword, Pageable pageable);

    @Query("""
        SELECT u FROM User u
        JOIN FETCH u.userProfile
        JOIN FETCH u.role
        WHERE u.id = :id
          AND u.deletedAt IS NULL
    """)
    Optional<User> findDetailById(Long id);


    @Query(value = "SELECT * FROM users WHERE id = :id", nativeQuery = true)
    Optional<User> findByIdIncludingDeleted(@Param("id") Long id);

    @Query("SELECT u FROM User u WHERE u.username = :username AND u.deletedAt IS NULL")
    Optional<User> findByUsername(@Param("username") String username);
}