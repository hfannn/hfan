package com.vn.backend.service.impl;

import com.vn.backend.dto.request.ShippingProviderRequest;
import com.vn.backend.dto.response.ShippingProviderResponse;
import com.vn.backend.entity.ShippingProvider;
import com.vn.backend.repository.ShippingProviderRepository;
import com.vn.backend.service.ShippingProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShippingProviderServiceImpl implements ShippingProviderService {

    private final ShippingProviderRepository shippingProviderRepository;

    @Override
    public Page<ShippingProviderResponse> getAllShippingProviders(Pageable pageable) {
        return shippingProviderRepository.findAllActive(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public List<ShippingProviderResponse> getAllActiveShippingProviders() {
        return shippingProviderRepository.findAllActive().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ShippingProviderResponse getShippingProviderById(Long id) {
        ShippingProvider provider = shippingProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn vị vận chuyển với ID: " + id));
        return mapToResponse(provider);
    }

    @Override
    @Transactional
    public ShippingProviderResponse createShippingProvider(ShippingProviderRequest request) {
        ShippingProvider provider = new ShippingProvider();
        provider.setCode(request.getCode());
        provider.setName(request.getName());
        provider.setIsActive(request.getIsActive());

        ShippingProvider savedProvider = shippingProviderRepository.save(provider);
        return mapToResponse(savedProvider);
    }

    @Override
    @Transactional
    public ShippingProviderResponse updateShippingProvider(Long id, ShippingProviderRequest request) {
        ShippingProvider provider = shippingProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn vị vận chuyển với ID: " + id));

        provider.setCode(request.getCode());
        provider.setName(request.getName());
        provider.setIsActive(request.getIsActive());

        ShippingProvider updatedProvider = shippingProviderRepository.save(provider);
        return mapToResponse(updatedProvider);
    }

    @Override
    @Transactional
    public void deleteShippingProvider(Long id) {
        ShippingProvider provider = shippingProviderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn vị vận chuyển với ID: " + id));

        shippingProviderRepository.delete(provider);
    }

    private ShippingProviderResponse mapToResponse(ShippingProvider provider) {
        ShippingProviderResponse response = new ShippingProviderResponse();
        response.setId(provider.getId());
        response.setCode(provider.getCode());
        response.setName(provider.getName());
        response.setIsActive(provider.getIsActive());
        response.setCreatedAt(provider.getCreatedAt());
        return response;
    }
}
