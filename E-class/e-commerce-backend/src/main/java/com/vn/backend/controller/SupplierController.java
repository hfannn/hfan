package com.vn.backend.controller;
import com.vn.backend.entity.Supplier;
import com.vn.backend.repository.SupplierRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
    public Supplier create(@RequestBody @Valid Supplier supplier) {
        supplier.setId(null);
        supplier.setIsActive(true);
        return supplierRepository.save(supplier);
    }

    @PutMapping("/{id}")
    public Supplier update(@PathVariable Long id, @RequestBody @Valid Supplier req) {
        Supplier s = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhà cung cấp."));
        s.setName(req.getName());
        s.setCode(req.getCode());
        s.setPhone(req.getPhone());
        return supplierRepository.save(s);
    }


}
