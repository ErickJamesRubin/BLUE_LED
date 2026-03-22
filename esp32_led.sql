-- ============================================================
-- ESP32 LED Control System - Database Setup
-- Mobile Legends Theme
-- ============================================================

CREATE DATABASE IF NOT EXISTS esp32_led CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE esp32_led;

-- ------------------------------------------------------------
-- Table: led_status
-- Stores the current LED state (0=OFF, 1=ON, 2=BLINK)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS led_status (
    id         INT          NOT NULL AUTO_INCREMENT,
    status     INT          NOT NULL DEFAULT 0 COMMENT '0=OFF, 1=ON, 2=BLINK',
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default row (only one row is ever used)
INSERT INTO led_status (status) VALUES (0);

-- ------------------------------------------------------------
-- Table: logs
-- Stores every action sent from the dashboard
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
    id        INT          NOT NULL AUTO_INCREMENT,
    action    VARCHAR(50)  NOT NULL COMMENT 'e.g. TURN ON, TURN OFF, BLINK',
    value     INT          NOT NULL COMMENT '0=OFF, 1=ON, 2=BLINK',
    timestamp TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;