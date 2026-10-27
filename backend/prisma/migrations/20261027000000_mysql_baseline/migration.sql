-- CreateTable
CREATE TABLE `DocumentRequirement` (
    `id` VARCHAR(191) NOT NULL,
    `ramo` VARCHAR(191) NOT NULL,
    `clientType` ENUM('PERSONA_FISICA', 'PERSONA_MORAL') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `DocumentRequirement_ramo_clientType_name_key`(`ramo`, `clientType`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RequestDocument` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `requirementId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDIENTE', 'VALIDADO', 'OBSERVADO') NOT NULL DEFAULT 'PENDIENTE',
    `note` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RequestDocument_requestId_requirementId_key`(`requestId`, `requirementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatalogItem` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('RAMO', 'PRODUCTO', 'INCIDENCIA') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ramo` VARCHAR(191) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CatalogItem_type_name_ramo_key`(`type`, `name`, `ramo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incident` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `catalogId` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `status` ENUM('ABIERTA', 'RESUELTA') NOT NULL DEFAULT 'ABIERTA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('AGENT', 'CONTROL', 'ADMIN') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRamo` (
    `id` VARCHAR(191) NOT NULL,
    `ramo` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserRamo_userId_ramo_key`(`userId`, `ramo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('PERSONA_FISICA', 'PERSONA_MORAL') NOT NULL,
    `rfc` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Client_folio_key`(`folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricalPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `policyNumber` VARCHAR(191) NULL,
    `ramo` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NULL,
    `startDate` VARCHAR(191) NULL,
    `endDate` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'CSV',
    `clientId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HistoricalPolicy_folio_key`(`folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quote` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `ramo` VARCHAR(191) NOT NULL,
    `product` VARCHAR(191) NULL,
    `detail` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `insuredSum` DOUBLE NULL,
    `status` ENUM('BORRADOR', 'CALCULADA', 'CONVERTIDA') NOT NULL DEFAULT 'BORRADOR',
    `clientId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Quote_folio_key`(`folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Request` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NULL,
    `status` ENUM('EN_REVISION', 'CON_OBSERVACIONES', 'ACEPTADA') NOT NULL DEFAULT 'EN_REVISION',
    `clientId` VARCHAR(191) NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `observation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Request_folio_key`(`folio`),
    UNIQUE INDEX `Request_quoteId_key`(`quoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RequestDocument` ADD CONSTRAINT `RequestDocument_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RequestDocument` ADD CONSTRAINT `RequestDocument_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `DocumentRequirement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `Request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_catalogId_fkey` FOREIGN KEY (`catalogId`) REFERENCES `CatalogItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRamo` ADD CONSTRAINT `UserRamo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricalPolicy` ADD CONSTRAINT `HistoricalPolicy_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `Request_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

