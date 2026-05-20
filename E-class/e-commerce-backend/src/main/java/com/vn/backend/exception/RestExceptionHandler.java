package com.vn.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class RestExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(NotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> conflict(ConflictException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> badRequest(BadRequestException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .orElse("Dữ liệu không hợp lệ");
        return build(HttpStatus.BAD_REQUEST, msg);
    }

    @ExceptionHandler(VoucherChangedException.class)
    public ResponseEntity<Map<String, Object>> voucherChanged(VoucherChangedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("errorCode", "NEED_CONFIRM_VOUCHER_CHANGED");
        body.put("message", "Voucher da thay doi");
        body.put("voucherCode", ex.getVoucherCode());
        body.put("oldDiscountAmount", ex.getOldDiscountAmount());
        body.put("newDiscountAmount", ex.getNewDiscountAmount());
        body.put("oldFinalTotal", ex.getOldFinalTotal());
        body.put("newFinalTotal", ex.getNewFinalTotal());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status.value());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}