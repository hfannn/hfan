package com.vn.backend.config;

import com.vn.backend.entity.Attribute;
import com.vn.backend.repository.AttributeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class MasterDataInitializer implements ApplicationRunner {

    private final AttributeRepository attributeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedAttribute("COLOR", "Màu sắc");
        seedAttribute("SIZE", "Kích cỡ");
        seedAttribute("MATERIAL", "Chất liệu");
    }

    private void seedAttribute(String code, String name) {
        if (attributeRepository.findByCodeIgnoreCase(code).isEmpty()) {
            attributeRepository.save(Attribute.builder()
                    .code(code)
                    .name(name)
                    .build());
            log.info("Seeded attribute: {} ({})", code, name);
        }
    }
}
