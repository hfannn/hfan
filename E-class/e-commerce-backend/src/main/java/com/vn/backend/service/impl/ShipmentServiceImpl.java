package com.vn.backend.service.impl;

import com.vn.backend.dto.request.ShipmentRequest;
import com.vn.backend.dto.response.ShipmentResponse;
import com.vn.backend.entity.Order;
import com.vn.backend.entity.Shipment;
import com.vn.backend.entity.ShippingProvider;
import com.vn.backend.exception.ResourceNotFoundException;
import com.vn.backend.repository.OrderRepository;
import com.vn.backend.repository.ShipmentRepository;
import com.vn.backend.repository.ShippingProviderRepository;
import com.vn.backend.service.ShipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final ShippingProviderRepository shippingProviderRepository;

    @Override
    public Page<ShipmentResponse> getAll(Pageable pageable) {
        return shipmentRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public ShipmentResponse getById(Long id) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vận đơn với ID: " + id));
        return mapToResponse(shipment);
    }

    @Override
    @Transactional
    public ShipmentResponse create(ShipmentRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + request.getOrderId()));
        ShippingProvider shippingProvider = shippingProviderRepository.findById(request.getShippingProviderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn vị vận chuyển với ID: " + request.getShippingProviderId()));

        Shipment shipment = Shipment.builder()
                .order(order)
                .shippingProvider(shippingProvider)
                .trackingCode(request.getTrackingCode())
                .shippingFee(request.getShippingFee())
                .status(request.getStatus())
                .build();

        Shipment saved = shipmentRepository.save(shipment);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ShipmentResponse update(Long id, ShipmentRequest request) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vận đơn với ID: " + id));

        shipment.setTrackingCode(request.getTrackingCode());
        shipment.setShippingFee(request.getShippingFee());
        shipment.setStatus(request.getStatus());

        Shipment updated = shipmentRepository.save(shipment);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        shipmentRepository.deleteById(id);
    }

    private ShipmentResponse mapToResponse(Shipment shipment) {
        ShipmentResponse response = new ShipmentResponse();
        response.setId(shipment.getId());
        response.setOrderId(shipment.getOrder().getId());
        response.setShippingProviderName(shipment.getShippingProvider().getName());
        response.setTrackingCode(shipment.getTrackingCode());
        response.setShippingFee(shipment.getShippingFee());
        response.setStatus(shipment.getStatus());
        if (shipment.getCreatedAt() != null) {
            response.setCreatedAt(shipment.getCreatedAt().toLocalDateTime());
        }
        return response;
    }
}
