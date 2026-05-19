package com.vn.backend.service.impl;

import com.vn.backend.dto.request.InventoryTransactionRequest;
import com.vn.backend.dto.response.InventoryTransactionResponse;
import com.vn.backend.entity.InventoryTransaction;
import com.vn.backend.entity.ProductVariant;
import com.vn.backend.entity.Store;
import com.vn.backend.repository.InventoryTransactionRepository;
import com.vn.backend.repository.ProductVariantRepository;
import com.vn.backend.repository.StoreRepository;
import com.vn.backend.service.InventoryTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InventoryTransactionServiceImpl implements InventoryTransactionService {

    private final InventoryTransactionRepository transactionRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StoreRepository storeRepository;

    @Override
    public Page<InventoryTransactionResponse> getAllTransactions(Pageable pageable) {
        return transactionRepository.findAllWithPagination(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public InventoryTransactionResponse getTransactionById(Long id) {
        InventoryTransaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giao dịch kho với ID: " + id));
        return mapToResponse(transaction);
    }

    @Override
    @Transactional
    public InventoryTransactionResponse createTransaction(InventoryTransactionRequest request) {
        InventoryTransaction transaction = new InventoryTransaction();

        // Set product variant
        ProductVariant variant = productVariantRepository.findById(request.getProductVariantId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy biến thể sản phẩm."));
        transaction.setProductVariant(variant);

        // Set store if provided
        if (request.getStoreId() != null) {
            Store store = storeRepository.findById(request.getStoreId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng."));
            transaction.setStore(store);
        }

        transaction.setTransactionType(request.getTransactionType());
        transaction.setQuantity(request.getQuantity());
        transaction.setReason(request.getReason());
        transaction.setReferenceCode(request.getReferenceCode());

        InventoryTransaction savedTransaction = transactionRepository.save(transaction);
        return mapToResponse(savedTransaction);
    }

    @Override
    public Page<InventoryTransactionResponse> getTransactionsByVariant(Long variantId, Pageable pageable) {
        return transactionRepository.findByProductVariantId(variantId, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public Page<InventoryTransactionResponse> getTransactionsByStore(Long storeId, Pageable pageable) {
        return transactionRepository.findByStoreId(storeId, pageable)
                .map(this::mapToResponse);
    }

    private InventoryTransactionResponse mapToResponse(InventoryTransaction transaction) {
        InventoryTransactionResponse response = new InventoryTransactionResponse();
        response.setId(transaction.getId());
        response.setProductVariantId(transaction.getProductVariant().getId());
        response.setProductVariantCode(transaction.getProductVariant().getCode());

        if (transaction.getStore() != null) {
            response.setStoreId(transaction.getStore().getId());
            response.setStoreName(transaction.getStore().getName());
        }

        response.setTransactionType(transaction.getTransactionType());
        response.setQuantity(transaction.getQuantity());
        response.setReason(transaction.getReason());
        response.setReferenceCode(transaction.getReferenceCode());
        response.setCreatedAt(transaction.getCreatedAt());
        return response;
    }
}
