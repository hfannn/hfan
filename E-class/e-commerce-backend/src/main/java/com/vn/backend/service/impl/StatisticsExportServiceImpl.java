package com.vn.backend.service.impl;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.vn.backend.dto.request.StatisticsQuery;
import com.vn.backend.dto.response.PageResponse;
import com.vn.backend.dto.response.statistics.DashboardCompareResponse;
import com.vn.backend.dto.response.statistics.DashboardResponse;
import com.vn.backend.dto.response.statistics.OrderStatusResponse;
import com.vn.backend.dto.response.statistics.TopCustomerResponse;
import com.vn.backend.dto.response.statistics.TopEmployeeResponse;
import com.vn.backend.dto.response.statistics.TopProductResponse;
import com.vn.backend.service.StatisticsExportService;
import com.vn.backend.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StatisticsExportServiceImpl implements StatisticsExportService {

    private final StatisticsService statisticsService;

    @Override
    public byte[] exportTopProductsExcel(StatisticsQuery query, int page, int size) {
        PageResponse<TopProductResponse> pageData =
                statisticsService.getTopProducts(query, page, size);

        List<TopProductResponse> items =
                pageData != null && pageData.getContent() != null
                        ? pageData.getContent()
                        : Collections.emptyList();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Top Products");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Product ID");
            header.createCell(1).setCellValue("Mã sản phẩm");
            header.createCell(2).setCellValue("Tên sản phẩm");
            header.createCell(3).setCellValue("Thương hiệu");
            header.createCell(4).setCellValue("Danh mục");
            header.createCell(5).setCellValue("Đã bán");
            header.createCell(6).setCellValue("Doanh thu");
            header.createCell(7).setCellValue("Lợi nhuận");

            int rowIndex = 1;
            for (TopProductResponse item : items) {
                Row row = sheet.createRow(rowIndex++);

                row.createCell(0).setCellValue(item.getProductId() != null ? item.getProductId() : 0);
                row.createCell(1).setCellValue(item.getProductCode() != null ? item.getProductCode() : "");
                row.createCell(2).setCellValue(item.getProductName() != null ? item.getProductName() : "");
                row.createCell(3).setCellValue(item.getBrandName() != null ? item.getBrandName() : "");
                row.createCell(4).setCellValue(item.getCategoryName() != null ? item.getCategoryName() : "");
                row.createCell(5).setCellValue(item.getTotalSold() != null ? item.getTotalSold() : 0);
                row.createCell(6).setCellValue(item.getRevenue() != null ? item.getRevenue().doubleValue() : 0);
                row.createCell(7).setCellValue(item.getProfit() != null ? item.getProfit().doubleValue() : 0);
            }

            for (int i = 0; i <= 7; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export top products excel failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportTopProductsPdf(StatisticsQuery query, int page, int size) {
        PageResponse<TopProductResponse> pageData =
                statisticsService.getTopProducts(query, page, size);

        List<TopProductResponse> items =
                pageData != null && pageData.getContent() != null
                        ? pageData.getContent()
                        : Collections.emptyList();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL);

            document.add(new Paragraph("BAO CAO TOP SAN PHAM", titleFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);

            table.addCell(new Phrase("Product ID", headerFont));
            table.addCell(new Phrase("Ma SP", headerFont));
            table.addCell(new Phrase("Ten SP", headerFont));
            table.addCell(new Phrase("Thuong hieu", headerFont));
            table.addCell(new Phrase("Danh muc", headerFont));
            table.addCell(new Phrase("Da ban", headerFont));
            table.addCell(new Phrase("Doanh thu", headerFont));
            table.addCell(new Phrase("Loi nhuan", headerFont));

            for (TopProductResponse item : items) {
                table.addCell(new Phrase(String.valueOf(item.getProductId() != null ? item.getProductId() : 0), bodyFont));
                table.addCell(new Phrase(item.getProductCode() != null ? item.getProductCode() : "", bodyFont));
                table.addCell(new Phrase(item.getProductName() != null ? item.getProductName() : "", bodyFont));
                table.addCell(new Phrase(item.getBrandName() != null ? item.getBrandName() : "", bodyFont));
                table.addCell(new Phrase(item.getCategoryName() != null ? item.getCategoryName() : "", bodyFont));
                table.addCell(new Phrase(String.valueOf(item.getTotalSold() != null ? item.getTotalSold() : 0), bodyFont));
                table.addCell(new Phrase(item.getRevenue() != null ? item.getRevenue().toPlainString() : "0", bodyFont));
                table.addCell(new Phrase(item.getProfit() != null ? item.getProfit().toPlainString() : "0", bodyFont));
            }

            document.add(table);
            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export top products pdf failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportTopCustomersExcel(StatisticsQuery query, int page, int size) {
        PageResponse<TopCustomerResponse> pageData = statisticsService.getTopCustomers(query, page, size);
        List<TopCustomerResponse> items =
                pageData != null && pageData.getContent() != null
                        ? pageData.getContent()
                        : Collections.emptyList();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Top Customers");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Customer ID");
            header.createCell(1).setCellValue("Mã khách hàng");
            header.createCell(2).setCellValue("Họ tên");
            header.createCell(3).setCellValue("Tổng đơn");
            header.createCell(4).setCellValue("Tổng chi tiêu");

            int rowIndex = 1;
            for (TopCustomerResponse item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.customerId() != null ? item.customerId() : 0);
                row.createCell(1).setCellValue(item.customerCode() != null ? item.customerCode() : "");
                row.createCell(2).setCellValue(item.fullName() != null ? item.fullName() : "");
                row.createCell(3).setCellValue(item.totalOrders() != null ? item.totalOrders() : 0);
                row.createCell(4).setCellValue(item.totalSpent() != null ? item.totalSpent().doubleValue() : 0);
            }

            for (int i = 0; i <= 4; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export top customers excel failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportTopCustomersPdf(StatisticsQuery query, int page, int size) {
        PageResponse<TopCustomerResponse> pageData = statisticsService.getTopCustomers(query, page, size);
        List<TopCustomerResponse> items =
                pageData != null && pageData.getContent() != null
                        ? pageData.getContent()
                        : Collections.emptyList();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL);

            document.add(new Paragraph("BAO CAO TOP KHACH HANG", titleFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);

            table.addCell(new Phrase("Customer ID", headerFont));
            table.addCell(new Phrase("Ma KH", headerFont));
            table.addCell(new Phrase("Ho ten", headerFont));
            table.addCell(new Phrase("Tong don", headerFont));
            table.addCell(new Phrase("Tong chi tieu", headerFont));

            for (TopCustomerResponse item : items) {
                table.addCell(new Phrase(String.valueOf(item.customerId() != null ? item.customerId() : 0), bodyFont));
                table.addCell(new Phrase(item.customerCode() != null ? item.customerCode() : "", bodyFont));
                table.addCell(new Phrase(item.fullName() != null ? item.fullName() : "", bodyFont));
                table.addCell(new Phrase(String.valueOf(item.totalOrders() != null ? item.totalOrders() : 0), bodyFont));
                table.addCell(new Phrase(item.totalSpent() != null ? item.totalSpent().toPlainString() : "0", bodyFont));
            }

            document.add(table);
            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export top customers pdf failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportTopEmployeesExcel(StatisticsQuery query, int page, int size) {
        PageResponse<TopEmployeeResponse> pageData = statisticsService.getTopEmployees(query, page, size);
        List<TopEmployeeResponse> items =
                pageData != null && pageData.getContent() != null
                        ? pageData.getContent()
                        : Collections.emptyList();

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Top Employees");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Employee ID");
            header.createCell(1).setCellValue("Mã nhân viên");
            header.createCell(2).setCellValue("Họ tên");
            header.createCell(3).setCellValue("Tổng đơn");
            header.createCell(4).setCellValue("Doanh thu");

            int rowIndex = 1;
            for (TopEmployeeResponse item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.employeeId() != null ? item.employeeId() : 0);
                row.createCell(1).setCellValue(item.employeeCode() != null ? item.employeeCode() : "");
                row.createCell(2).setCellValue(item.fullName() != null ? item.fullName() : "");
                row.createCell(3).setCellValue(item.totalOrders() != null ? item.totalOrders() : 0);
                row.createCell(4).setCellValue(item.revenue() != null ? item.revenue().doubleValue() : 0);
            }

            for (int i = 0; i <= 4; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export top employees excel failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportTopEmployeesPdf(StatisticsQuery query, int page, int size) {
        PageResponse<TopEmployeeResponse> pageData = statisticsService.getTopEmployees(query, page, size);
        List<TopEmployeeResponse> items =
                pageData != null && pageData.getContent() != null
                        ? pageData.getContent()
                        : Collections.emptyList();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL);

            document.add(new Paragraph("BAO CAO TOP NHAN VIEN", titleFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);

            table.addCell(new Phrase("Employee ID", headerFont));
            table.addCell(new Phrase("Ma NV", headerFont));
            table.addCell(new Phrase("Ho ten", headerFont));
            table.addCell(new Phrase("Tong don", headerFont));
            table.addCell(new Phrase("Doanh thu", headerFont));

            for (TopEmployeeResponse item : items) {
                table.addCell(new Phrase(String.valueOf(item.employeeId() != null ? item.employeeId() : 0), bodyFont));
                table.addCell(new Phrase(item.employeeCode() != null ? item.employeeCode() : "", bodyFont));
                table.addCell(new Phrase(item.fullName() != null ? item.fullName() : "", bodyFont));
                table.addCell(new Phrase(String.valueOf(item.totalOrders() != null ? item.totalOrders() : 0), bodyFont));
                table.addCell(new Phrase(item.revenue() != null ? item.revenue().toPlainString() : "0", bodyFont));
            }

            document.add(table);
            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export top employees pdf failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportOrderStatusExcel(StatisticsQuery query) {
        List<OrderStatusResponse> data = statisticsService.getOrderStatusStatistics(query);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Order Status");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Trạng thái");
            header.createCell(1).setCellValue("Tổng đơn");
            header.createCell(2).setCellValue("Tổng tiền");

            int rowIndex = 1;
            for (OrderStatusResponse item : data) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.status() != null ? item.status() : "");
                row.createCell(1).setCellValue(item.totalOrders() != null ? item.totalOrders() : 0);
                row.createCell(2).setCellValue(item.totalAmount() != null ? item.totalAmount().doubleValue() : 0);
            }

            for (int i = 0; i <= 2; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export order status excel failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportOrderStatusPdf(StatisticsQuery query) {
        List<OrderStatusResponse> data = statisticsService.getOrderStatusStatistics(query);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL);

            document.add(new Paragraph("BÁO CÁO TRẠNG THÁI ĐƠN HÀNG", titleFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);

            table.addCell(new Phrase("Trạng thái", headerFont));
            table.addCell(new Phrase("Tổng đơn", headerFont));
            table.addCell(new Phrase("Tổng tiền", headerFont));

            for (OrderStatusResponse item : data) {
                table.addCell(new Phrase(item.status() != null ? item.status() : "", bodyFont));
                table.addCell(new Phrase(String.valueOf(item.totalOrders() != null ? item.totalOrders() : 0), bodyFont));
                table.addCell(new Phrase(item.totalAmount() != null ? item.totalAmount().toPlainString() : "0", bodyFont));
            }

            document.add(table);
            document.close();

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export order status pdf failed: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] exportDashboardPdf(StatisticsQuery query) {
        DashboardResponse dashboard = statisticsService.getDashboard(query);
        DashboardCompareResponse compare = statisticsService.getDashboardCompare(query);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD);
            Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 10, Font.NORMAL);

            document.add(new Paragraph("BAO CAO TONG QUAN THONG KE", titleFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Tong don hang: " + dashboard.totalOrders(), bodyFont));
            document.add(new Paragraph("Tong doanh thu: " + dashboard.totalRevenue(), bodyFont));
            document.add(new Paragraph("Tong san pham da ban: " + dashboard.totalItemsSold(), bodyFont));
            document.add(new Paragraph("Tong loi nhuan: " + dashboard.totalProfit(), bodyFont));
            document.add(new Paragraph("Tong ton kho: " + dashboard.totalStock(), bodyFont));
            document.add(new Paragraph("Sap het hang: " + dashboard.lowStockCount(), bodyFont));

            document.add(new Paragraph(" ", bodyFont));
            document.add(new Paragraph("SO SANH VOI KY TRUOC", sectionFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Doanh thu hien tai: " + compare.revenue().currentValue(), bodyFont));
            document.add(new Paragraph("Doanh thu ky truoc: " + compare.revenue().previousValue(), bodyFont));
            document.add(new Paragraph("Chenh lech: " + compare.revenue().diffValue() + " (" + compare.revenue().diffPercent() + "%)", bodyFont));
            document.add(new Paragraph(" ", bodyFont));

            document.add(new Paragraph("Loi nhuan hien tai: " + compare.profit().currentValue(), bodyFont));
            document.add(new Paragraph("Loi nhuan ky truoc: " + compare.profit().previousValue(), bodyFont));
            document.add(new Paragraph("Chenh lech: " + compare.profit().diffValue() + " (" + compare.profit().diffPercent() + "%)", bodyFont));
            document.add(new Paragraph(" ", bodyFont));

            document.add(new Paragraph("Số đơn hiện tại: " + compare.orders().currentValue(), bodyFont));
            document.add(new Paragraph("Số đơn kỳ trước: " + compare.orders().previousValue(), bodyFont));
            document.add(new Paragraph("Chênh lệch: " + compare.orders().diffValue() + " (" + compare.orders().diffPercent() + "%)", bodyFont));
            document.add(new Paragraph(" ", bodyFont));

            document.add(new Paragraph("Sản phẩm bán hiện tại: " + compare.itemsSold().currentValue(), bodyFont));
            document.add(new Paragraph("Sản phẩm bán kỳ trước: " + compare.itemsSold().previousValue(), bodyFont));
            document.add(new Paragraph("Chênh lệch: " + compare.itemsSold().diffValue() + " (" + compare.itemsSold().diffPercent() + "%)", bodyFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Export dashboard pdf failed: " + e.getMessage(), e);
        }
    }
}
