package com.vn.backend.controller;

import com.vn.backend.entity.Supplier;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.SupplierRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/suppliers")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public List<Supplier> getAll() {
        return supplierRepository.findByDeletedAtIsNullAndIsActiveTrue();
    }

    @PostMapping
    public Supplier create(@RequestBody @Valid SupplierRequest req) {
        Supplier s = new Supplier();
        s.setCode(req.code().trim().toUpperCase());
        s.setName(req.name().trim());
        s.setPhone(req.phone() != null ? req.phone().trim() : null);
        s.setIsActive(true);
        return supplierRepository.save(s);
    }

    @PutMapping("/{id}")
    public Supplier update(@PathVariable Long id, @RequestBody @Valid SupplierRequest req) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà cung cấp"));
        s.setCode(req.code().trim().toUpperCase());
        s.setName(req.name().trim());
        s.setPhone(req.phone() != null ? req.phone().trim() : null);
        return supplierRepository.save(s);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà cung cấp"));
        s.setIsActive(false);
        s.setDeletedAt(OffsetDateTime.now());
        supplierRepository.save(s);
        return ResponseEntity.noContent().build();
    }

    record SupplierRequest(
            @NotBlank(message = "Mã nhà cung cấp không được để trống")
            @Size(max = 50, message = "Mã tối đa 50 ký tự")
            String code,

            @NotBlank(message = "Tên nhà cung cấp không được để trống")
            String name,

            @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
            String phone
    ) {}
}
