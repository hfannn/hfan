package com.vn.backend.service.impl;

import com.vn.backend.dto.request.CategoryRequest;
import com.vn.backend.dto.response.CategoryResponse;
import com.vn.backend.entity.Category;
import com.vn.backend.repository.CategoryRepository;
import com.vn.backend.service.CategoryService;
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
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    public Page<CategoryResponse> getAllCategories(Pageable pageable) {
        return categoryRepository.findAllActive(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public List<CategoryResponse> getAllActiveCategories() {
        return categoryRepository.findAllActive().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với ID: " + id));
        return mapToResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        Category category = new Category();
        category.setName(request.getName());
        category.setSizeChartUrl(request.getSizeChartUrl());
        category.setIsActive(request.getIsActive());

        Category savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với ID: " + id));

        category.setName(request.getName());
        category.setSizeChartUrl(request.getSizeChartUrl());
        category.setIsActive(request.getIsActive());

        Category updatedCategory = categoryRepository.save(category);
        return mapToResponse(updatedCategory);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findByIdActive(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với ID: " + id));

        category.setDeletedAt(OffsetDateTime.now());
        categoryRepository.save(category);
    }

    @Override
    public Page<CategoryResponse> searchCategories(String keyword, Pageable pageable) {
        return categoryRepository.searchByName(keyword, pageable)
                .map(this::mapToResponse);
    }

    private CategoryResponse mapToResponse(Category category) {
        CategoryResponse response = new CategoryResponse();
        response.setId(category.getId());
        response.setName(category.getName());
        response.setSizeChartUrl(category.getSizeChartUrl());
        response.setIsActive(category.getIsActive());
        response.setDeletedAt(category.getDeletedAt());
        return response;
    }
}
