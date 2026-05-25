package com.vn.backend.controller;

import com.vn.backend.entity.Origin;
import com.vn.backend.exception.ConflictException;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.OriginRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/v1/origins")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class OriginController {

    private final OriginRepository originRepository;

    @GetMapping
    public List<Origin> getAll() {
        return originRepository.findByDeletedAtIsNullAndIsActiveTrue();
    }

    @PostMapping
    public Origin create(@RequestBody @Valid OriginRequest req) {
        String name = req.name().trim();

        var existing = originRepository.findByNameIgnoreCaseAll(name);
        if (existing.isPresent()) {
            Origin origin = existing.get();
            if (origin.getDeletedAt() == null) {
                throw new ConflictException("Xuất xứ đã tồn tại.");
            }
            // Restore soft-deleted origin
            origin.setDeletedAt(null);
            origin.setIsActive(true);
            return originRepository.save(origin);
        }

        Origin origin = new Origin();
        origin.setName(name);
        origin.setIsActive(true);
        return originRepository.save(origin);
    }

    @PutMapping("/{id}")
    public Origin update(@PathVariable Long id, @RequestBody @Valid OriginRequest req) {
        Origin origin = originRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy xuất xứ"));
        String name = req.name().trim();
        if (originRepository.existsByNameIgnoreCaseAndDeletedAtIsNullAndIdNot(name, id)) {
            throw new ConflictException("Xuất xứ đã tồn tại.");
        }
        origin.setName(name);
        return originRepository.save(origin);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Origin origin = originRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy xuất xứ"));
        origin.setIsActive(false);
        origin.setDeletedAt(OffsetDateTime.now());
        originRepository.save(origin);
        return ResponseEntity.noContent().build();
    }

    record OriginRequest(
            @NotBlank(message = "Tên xuất xứ không được để trống")
            @Size(max = 255, message = "Tên tối đa 255 ký tự")
            String name
    ) {}
}
