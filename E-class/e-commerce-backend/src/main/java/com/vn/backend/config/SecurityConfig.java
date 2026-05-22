package com.vn.backend.config;

import com.vn.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth

                        // Public
                        .requestMatchers("/v1/auth/**", "/uploads/**", "/image/**", "/v1/chatbot/**").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/v1/home/**",
                                "/v1/products/**",
                                "/v1/brands/**",
                                "/v1/categories/**",
                                "/v1/origins/**",
                                "/v1/suppliers/**",
                                "/v1/attributes/**",
                                "/v1/attributes/*/values",
                                "/v1/colors/**",
                                "/v1/shipping-providers/active",
                                "/v1/promotions/public",
                                "/v1/products/*/reviews"
                        ).permitAll()

                        // Review: any authenticated user
                        .requestMatchers(HttpMethod.POST, "/v1/order-items/*/reviews")
                        .authenticated()

                        // Cart: CUSTOMER or ADMIN
                        .requestMatchers("/v1/cart/**")
                        .hasAnyRole("CUSTOMER", "ADMIN")

                        // Customer order placement
                        .requestMatchers(HttpMethod.POST, "/v1/orders")
                        .hasAnyRole("CUSTOMER", "ADMIN")

                        .requestMatchers(HttpMethod.POST, "/v1/orders/*/vnpay")
                        .hasAnyRole("CUSTOMER", "ADMIN")

                        // VNPay callbacks: public
                        .requestMatchers(HttpMethod.GET, "/v1/orders/vnpay/return")
                        .permitAll()

                        .requestMatchers(HttpMethod.GET, "/v1/orders/vnpay/ipn")
                        .permitAll()

                        // Customer order actions
                        .requestMatchers(HttpMethod.PUT, "/v1/orders/*/cancel")
                        .hasAnyRole("CUSTOMER", "ADMIN")

                        .requestMatchers(HttpMethod.POST, "/v1/orders/*/return-request")
                        .hasAnyRole("CUSTOMER", "ADMIN")

                        .requestMatchers(HttpMethod.PATCH, "/v1/orders/*/return-review")
                        .hasRole("ADMIN")

                        // Order read: CUSTOMER, ADMIN, STAFF
                        .requestMatchers(HttpMethod.GET, "/v1/orders/**")
                        .hasAnyRole("CUSTOMER", "ADMIN", "STAFF")

                        // Coupons & profile: any authenticated
                        .requestMatchers(HttpMethod.GET, "/v1/coupons/my-coupons")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET, "/v1/users/me")
                        .authenticated()

                        .requestMatchers("/v1/profile/me")
                        .authenticated()

                        // POS: ADMIN or STAFF
                        .requestMatchers("/v1/pos/**")
                        .hasAnyRole("ADMIN", "STAFF")

                        // Statistics: ADMIN only
                        .requestMatchers("/v1/statistics/**")
                        .hasRole("ADMIN")

                        // Product variant & image GET: ADMIN or STAFF (product GET is public above)
                        .requestMatchers(HttpMethod.GET, "/v1/product-variants/**", "/v1/product-images/**")
                        .hasAnyRole("ADMIN", "STAFF")

                        // Admin-only resources
                        .requestMatchers("/v1/admin/**").hasRole("ADMIN")

                        .requestMatchers("/v1/users/**", "/v1/roles/**")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                "/v1/products/**",
                                "/v1/product-variants/**",
                                "/v1/product-images/**"
                        ).hasRole("ADMIN")

                        .requestMatchers("/v1/brands/**",
                                "/v1/categories/**",
                                "/v1/origins/**",
                                "/v1/suppliers/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/v1/attributes/**",
                                "/v1/attribute-values/**",
                                "/v1/colors/**")
                        .hasRole("ADMIN")

                        // Payment method read: ADMIN or STAFF (POS checkout)
                        .requestMatchers(HttpMethod.GET, "/v1/payment-methods", "/v1/payment-methods/**")
                        .hasAnyRole("ADMIN", "STAFF")

                        .requestMatchers("/v1/payments/**",
                                "/v1/payment-methods/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/v1/shipments/**",
                                "/v1/shipping-providers/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/v1/inventory-transactions/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/v1/orders/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/v1/promotions/**")
                        .hasRole("ADMIN")
                        .requestMatchers("/promotions/**")
                        .hasRole("ADMIN")
                        .requestMatchers("/v1/coupons/**")
                        .hasRole("ADMIN")
                        .anyRequest().authenticated()
                )

                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }



    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }



    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
