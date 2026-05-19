package com.vn.backend.service.impl;

import com.vn.backend.dto.request.BrandRequest;
import com.vn.backend.dto.response.BrandResponse;
import com.vn.backend.entity.Brand;
import com.vn.backend.repository.BrandRepository;
import com.vn.backend.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;

    @Override
    public Page<BrandResponse> getAllBrands(Pageable pageable) {
        return brandRepository.findAllActive(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public List<BrandResponse> getAllActiveBrands() {
        return brandRepository.findAllActive().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public BrandResponse getBrandById(Long id) {
        Brand brand = brandRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu với ID: " + id));
        return mapToResponse(brand);
    }

    @Override
    @Transactional
    public BrandResponse createBrand(BrandRequest request) {
        Brand brand = new Brand();
        brand.setName(request.getName());
        brand.setIsActive(request.getIsActive());

        Brand savedBrand = brandRepository.save(brand);
        return mapToResponse(savedBrand);
    }

    @Override
    @Transactional
    public BrandResponse updateBrand(Long id, BrandRequest request) {
        Brand brand = brandRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu với ID: " + id));

        brand.setName(request.getName());
        brand.setIsActive(request.getIsActive());

        Brand updatedBrand = brandRepository.save(brand);
        return mapToResponse(updatedBrand);
    }

    @Override
    @Transactional
    public void deleteBrand(Long id) {
        Brand brand = brandRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu với ID: " + id));

        brand.setDeletedAt(OffsetDateTime.now());
        brandRepository.save(brand);
    }

    @Override
    public Page<BrandResponse> searchBrands(String keyword, Pageable pageable) {
        return brandRepository.searchByName(keyword, pageable)
                .map(this::mapToResponse);
    }

    private BrandResponse mapToResponse(Brand brand) {
        BrandResponse response = new BrandResponse();
        response.setId(brand.getId());
        response.setName(brand.getName());
        response.setIsActive(brand.getIsActive());
        response.setDeletedAt(brand.getDeletedAt());
        return response;
    }
}
