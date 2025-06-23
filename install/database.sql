-- ================================
-- KEYWORD PROCESSOR DATABASE SCHEMA
-- ================================

-- Projects Table
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seed_keyword` varchar(255) NOT NULL,
  `original_filename` varchar(500) NOT NULL,
  `total_clusters` int(11) NOT NULL DEFAULT 0,
  `total_keywords` int(11) NOT NULL DEFAULT 0,
  `total_volume` bigint(20) NOT NULL DEFAULT 0,
  `avg_difficulty` decimal(5,2) NOT NULL DEFAULT 0.00,
  `pillar_pages` int(11) NOT NULL DEFAULT 0,
  `sub_pages` int(11) NOT NULL DEFAULT 0,
  `processing_time_ms` int(11) NOT NULL DEFAULT 0,
  `webhook_sent` tinyint(1) NOT NULL DEFAULT 0,
  `webhook_response` text DEFAULT NULL,
  `status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seed_keyword` (`seed_keyword`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clusters Table
CREATE TABLE `clusters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `cluster_name` varchar(500) NOT NULL,
  `keyword_count` int(11) NOT NULL DEFAULT 0,
  `supporting_keywords` text DEFAULT NULL,
  `total_volume` bigint(20) NOT NULL DEFAULT 0,
  `avg_difficulty` decimal(5,2) NOT NULL DEFAULT 0.00,
  `min_difficulty` int(11) NOT NULL DEFAULT 0,
  `max_difficulty` int(11) NOT NULL DEFAULT 0,
  `topics` text DEFAULT NULL,
  `intent` text DEFAULT NULL,
  `avg_cpc` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `seed_keywords` text DEFAULT NULL,
  `cluster_type` enum('pillar','sub_page','unknown') NOT NULL DEFAULT 'unknown',
  `priority_score` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_total_volume` (`total_volume`),
  KEY `idx_cluster_type` (`cluster_type`),
  CONSTRAINT `fk_clusters_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Keywords Table
CREATE TABLE `keywords` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cluster_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `keyword` varchar(500) NOT NULL,
  `volume` int(11) NOT NULL DEFAULT 0,
  `difficulty` int(11) NOT NULL DEFAULT 0,
  `cpc` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `competitive_density` decimal(5,4) DEFAULT NULL,
  `serp_features` text DEFAULT NULL,
  `page` varchar(500) DEFAULT NULL,
  `page_type` varchar(100) DEFAULT NULL,
  `topic` varchar(200) DEFAULT NULL,
  `intent` varchar(100) DEFAULT NULL,
  `seed_keyword` varchar(255) DEFAULT NULL,
  `position` int(11) DEFAULT NULL,
  `url` text DEFAULT NULL,
  `is_main_keyword` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cluster_id` (`cluster_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_keyword` (`keyword`),
  KEY `idx_volume` (`volume`),
  KEY `idx_difficulty` (`difficulty`),
  CONSTRAINT `fk_keywords_cluster` FOREIGN KEY (`cluster_id`) REFERENCES `clusters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_keywords_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook Logs Table
CREATE TABLE `webhook_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `webhook_url` varchar(1000) NOT NULL,
  `payload` longtext NOT NULL,
  `response_status` int(11) DEFAULT NULL,
  `response_body` text DEFAULT NULL,
  `attempt_count` int(11) NOT NULL DEFAULT 1,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `error_message` text DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_success` (`success`),
  CONSTRAINT `fk_webhook_logs_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project Summary View
CREATE VIEW `project_summary` AS
SELECT 
    p.id,
    p.seed_keyword,
    p.original_filename,
    p.total_clusters,
    p.total_keywords,
    p.total_volume,
    p.avg_difficulty,
    p.pillar_pages,
    p.sub_pages,
    p.processing_time_ms,
    p.webhook_sent,
    p.status,
    p.created_at,
    COUNT(DISTINCT c.id) as actual_cluster_count,
    COUNT(DISTINCT k.id) as actual_keyword_count
FROM projects p
LEFT JOIN clusters c ON p.id = c.project_id
LEFT JOIN keywords k ON p.id = k.project_id
GROUP BY p.id;

-- Insert sample settings
INSERT INTO `projects` (`seed_keyword`, `original_filename`, `total_clusters`, `total_keywords`, `total_volume`, `avg_difficulty`, `status`) VALUES
('sample-project', 'sample_clusters_2025-01-01.csv', 5, 100, 50000, 35.5, 'completed');