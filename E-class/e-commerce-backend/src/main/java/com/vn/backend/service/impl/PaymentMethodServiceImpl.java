package com.vn.backend.service.impl;

import com.vn.backend.dto.request.PaymentMethodRequest;
import com.vn.backend.dto.response.PaymentMethodResponse;
import com.vn.backend.entity.PaymentMethod;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.PaymentMethodRepository;
import com.vn.backend.service.PaymentMethodService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentMethodServiceImpl implements PaymentMethodService {

    private final PaymentMethodRepository repository;

    @Override
    public List<PaymentMethodResponse> getAll() {
        return repository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PaymentMethodResponse create(PaymentMethodRequest request) {
        PaymentMethod entity = new PaymentMethod();
        entity.setCode(request.getCode());
        entity.setName(request.getName());
        entity.setIsActive(request.getIsActive());
        PaymentMethod saved = repository.save(entity);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public PaymentMethodResponse update(Long id, PaymentMethodRequest request) {
        PaymentMethod entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phương thức thanh toán với ID: " + id));
        entity.setCode(request.getCode());
        entity.setName(request.getName());
        entity.setIsActive(request.getIsActive());
        PaymentMethod updated = repository.save(entity);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private PaymentMethodResponse mapToResponse(PaymentMethod entity) {
        PaymentMethodResponse response = new PaymentMethodResponse();
        response.setId(entity.getId());
        response.setCode(entity.getCode());
        response.setName(entity.getName());
        response.setIsActive(entity.getIsActive());
        return response;
    }
}
