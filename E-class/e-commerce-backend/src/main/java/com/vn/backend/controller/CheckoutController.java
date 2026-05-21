package com.vn.backend.controller;

import com.vn.backend.dto.request.CheckoutQuoteRequest;
import com.vn.backend.dto.request.CheckoutValidationRequest;
import com.vn.backend.dto.response.CheckoutQuoteResponse;
import com.vn.backend.dto.response.CheckoutValidationResponse;
import com.vn.backend.security.CustomUserDetails;
import com.vn.backend.service.CheckoutQuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/checkout")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class CheckoutController {

    private final CheckoutQuoteService checkoutQuoteService;

    @PostMapping("/quote")
    public ResponseEntity<CheckoutQuoteResponse> quote(
            @Valid @RequestBody CheckoutQuoteRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(checkoutQuoteService.quote(request, userDetails));
    }

    @PostMapping("/validate")
    public ResponseEntity<CheckoutValidationResponse> validate(
            @Valid @RequestBody CheckoutValidationRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(checkoutQuoteService.validateCheckout(request, userDetails));
    }
}
