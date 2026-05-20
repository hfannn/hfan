package com.vn.backend.exception;

import lombok.Getter;

import java.math.BigDecimal;

@Getter
public class VoucherChangedException extends RuntimeException {

    private final String voucherCode;
    private final BigDecimal oldDiscountAmount;
    private final BigDecimal newDiscountAmount;
    private final BigDecimal oldFinalTotal;
    private final BigDecimal newFinalTotal;

    public VoucherChangedException(
            String voucherCode,
            BigDecimal oldDiscountAmount,
            BigDecimal newDiscountAmount,
            BigDecimal oldFinalTotal,
            BigDecimal newFinalTotal
    ) {
        super("Voucher da thay doi");
        this.voucherCode = voucherCode;
        this.oldDiscountAmount = oldDiscountAmount;
        this.newDiscountAmount = newDiscountAmount;
        this.oldFinalTotal = oldFinalTotal;
        this.newFinalTotal = newFinalTotal;
    }
}
