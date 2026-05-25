package com.vn.backend.service.impl;

import com.vn.backend.dto.request.AttributeValueRequest;
import com.vn.backend.dto.response.AttributeValueResponse;
import com.vn.backend.entity.Attribute;
import com.vn.backend.entity.AttributeValue;
import com.vn.backend.exception.ConflictException;
import com.vn.backend.exception.InvalidRequestException;
import com.vn.backend.repository.AttributeRepository;
import com.vn.backend.repository.AttributeValueRepository;
import com.vn.backend.service.AttributeValueService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AttributeValueServiceImpl implements AttributeValueService {

    private final AttributeRepository attributeRepository;
    private final AttributeValueRepository attributeValueRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AttributeValueResponse> getByCode(String code) {
        return attributeValueRepository.findActiveByAttributeCode(code)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public AttributeValueResponse createByCode(String code, AttributeValueRequest req) {
        if (req.getValue() == null || req.getValue().trim().isEmpty()) {
            throw new InvalidRequestException("Giá trị không được để trống");
        }

        Attribute attribute = attributeRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy thuộc tính: " + code));

        String normalizedValue = req.getValue().trim();

        Optional<AttributeValue> existing = attributeValueRepository
                .findByAttributeIdAndValueIgnoreCase(attribute.getId(), normalizedValue);

        if (existing.isPresent()) {
            AttributeValue av = existing.get();
            if (Boolean.TRUE.equals(av.getIsActive())) {
                throw new ConflictException(attribute.getName() + " đã tồn tại: " + normalizedValue);
            }
            // Restore inactive record
            av.setIsActive(true);
            attributeValueRepository.save(av);
            return toResponse(av);
        }

        AttributeValue entity = AttributeValue.builder()
                .attribute(attribute)
                .value(normalizedValue)
                .isActive(true)
                .build();

        attributeValueRepository.save(entity);
        return toResponse(entity);
    }

    @Override
    public AttributeValueResponse update(Long id, AttributeValueRequest req) {
        AttributeValue entity = attributeValueRepository.findById(id)
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy giá trị thuộc tính"));

        String normalizedValue = req.getValue().trim();

        Optional<AttributeValue> duplicate = attributeValueRepository
                .findByAttributeIdAndValueIgnoreCase(entity.getAttribute().getId(), normalizedValue);

        if (duplicate.isPresent() && !duplicate.get().getId().equals(id)) {
            throw new ConflictException(entity.getAttribute().getName() + " đã tồn tại: " + normalizedValue);
        }

        entity.setValue(normalizedValue);
        attributeValueRepository.save(entity);

        return toResponse(entity);
    }

    @Override
    public void disable(Long id) {
        AttributeValue entity = attributeValueRepository.findById(id)
                .orElseThrow(() -> new InvalidRequestException("Không tìm thấy giá trị thuộc tính"));

        entity.setIsActive(false);
        attributeValueRepository.save(entity);
    }

    private AttributeValueResponse toResponse(AttributeValue entity) {
        return AttributeValueResponse.builder()
                .id(entity.getId())
                .value(entity.getValue())
                .build();
    }
}