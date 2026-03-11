-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 11, 2026 at 04:37 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `academic_system`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_student_dashboard_stats` (IN `p_student_id` INT)   BEGIN
                -- 1. Overall Stats
                SELECT 
                    COUNT(DISTINCT m.module_id) as total_modules,
                    COUNT(DISTINCT lp.part_id) as total_learning_parts,
                    COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_parts,
                    COALESCE(ROUND((COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) / NULLIF(COUNT(DISTINCT lp.part_id), 0)) * 100, 2), 0) as completion_percentage,
                    0 as avg_score,
                    COUNT(DISTINCT a.assignment_id) as total_assignments,
                    COUNT(DISTINCT CASE WHEN ar.passed = TRUE THEN a.assignment_id END) as passed_assignments
                FROM users u
                JOIN modules m ON u.school_id = m.school_id
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = u.user_id
                LEFT JOIN assignments a ON lp.part_id = a.part_id
                LEFT JOIN assignment_results ar ON a.assignment_id = ar.assignment_id AND ar.student_id = u.user_id
                WHERE u.user_id = p_student_id AND m.is_published = TRUE;

                -- 2. Recent Activity
                SELECT 
                    'completed' as type,
                    m.module_name,
                    lp.title as content_title,
                    sp.status,
                    NULL as score,
                    sp.completed_at,
                    sp.time_spent_seconds / 60 as time_taken_minutes
                FROM student_progress sp
                JOIN learning_parts lp ON sp.part_id = lp.part_id
                JOIN units un ON lp.unit_id = un.unit_id
                JOIN modules m ON un.module_id = m.module_id
                WHERE sp.student_id = p_student_id AND sp.status = 'completed'
                ORDER BY sp.completed_at DESC
                LIMIT 5;

                -- 3. Module Progress
                SELECT 
                    m.module_name,
                    COUNT(DISTINCT lp.part_id) as total_parts,
                    COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_parts,
                    COALESCE(ROUND((COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) / NULLIF(COUNT(DISTINCT lp.part_id), 0)) * 100, 2), 0) as progress_percentage,
                    0 as avg_score
                FROM modules m
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = p_student_id
                WHERE m.school_id = (SELECT school_id FROM users WHERE user_id = p_student_id) AND m.is_published = TRUE
                GROUP BY m.module_id, m.module_name
                ORDER BY m.module_name;

                -- 4. Assignment Performance
                SELECT 
                    a.title,
                    a.total_marks,
                    a.max_attempts,
                    m.module_name,
                    ar_stats.best_score,
                    ar_stats.best_percentage,
                    ar_stats.attempts_used,
                    CASE WHEN ar_stats.passed > 0 THEN TRUE ELSE FALSE END as passed,
                    ar_stats.last_attempt_at
                FROM assignments a
                JOIN learning_parts lp ON a.part_id = lp.part_id
                JOIN units un ON lp.unit_id = un.unit_id
                JOIN modules m ON un.module_id = m.module_id
                JOIN users u ON m.school_id = u.school_id
                LEFT JOIN (
                    SELECT 
                        assignment_id, 
                        student_id, 
                        MAX(best_score) as best_score, 
                        MAX(best_percentage) as best_percentage,
                        COUNT(*) as attempts_used,
                        MAX(CASE WHEN passed THEN 1 ELSE 0 END) as passed,
                        MAX(last_attempt_at) as last_attempt_at
                    FROM assignment_results
                    JOIN assignments USING(assignment_id)
                    GROUP BY assignment_id, student_id
                ) ar_stats ON a.assignment_id = ar_stats.assignment_id AND u.user_id = ar_stats.student_id
                WHERE u.user_id = p_student_id AND m.is_published = TRUE
                ORDER BY ar_stats.last_attempt_at DESC;
            END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_teacher_dashboard_stats` (IN `p_teacher_id` INT)   BEGIN
                -- 1. Overview Stats
                SELECT 
                    COUNT(DISTINCT tc.assignment_id) as total_classes,
                    COUNT(DISTINCT ts.student_id) as total_students,
                    COALESCE(AVG(ts.avg_score), 0) as overall_avg_score,
                    COALESCE(AVG(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0)), 0) as avg_completion_rate
                FROM teacher_classes tc
                LEFT JOIN teacher_students_view ts ON tc.assignment_id = ts.assignment_id
                WHERE tc.teacher_id = p_teacher_id AND tc.is_active = TRUE;

                -- 2. Class List
                SELECT 
                    tc.assignment_id,
                    tc.module_id,
                    tc.class_section,
                    m.module_name,
                    COUNT(DISTINCT ts.student_id) as student_count,
                    COALESCE(AVG(ts.avg_score), 0) as class_avg_score,
                    COALESCE(AVG(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0)), 0) as completion_rate,
                    MAX(ts.last_activity_date) as last_activity
                FROM teacher_classes tc
                JOIN modules m ON tc.module_id = m.module_id
                LEFT JOIN teacher_students_view ts ON tc.assignment_id = ts.assignment_id
                WHERE tc.teacher_id = p_teacher_id AND tc.is_active = TRUE
                GROUP BY tc.assignment_id, m.module_name, tc.class_section;

                -- 3. Recent Activity (Global for teacher)
                SELECT 
                    u.full_name as student_name,
                    m.module_name,
                    lp.title as content_title,
                    sp.score,
                    sp.completed_at
                FROM teacher_classes tc
                JOIN modules m ON tc.module_id = m.module_id
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                JOIN student_progress sp ON lp.part_id = sp.part_id
                JOIN users u ON sp.student_id = u.user_id
                WHERE tc.teacher_id = p_teacher_id 
                  AND (u.class_grade = m.grade_level OR m.grade_level IS NULL OR u.class_grade IS NULL)
                  AND sp.completed_at IS NOT NULL
                ORDER BY sp.completed_at DESC
                LIMIT 5;

                -- 4. Performance Trends (Last 7 days)
                SELECT 
                    DATE(sp.completed_at) as activity_date,
                    COUNT(DISTINCT sp.student_id) as active_students,
                    COUNT(DISTINCT sp.part_id) as completed_items,
                    AVG(sp.score) as avg_score
                FROM teacher_classes tc
                JOIN modules m ON tc.module_id = m.module_id
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                JOIN student_progress sp ON lp.part_id = sp.part_id
                JOIN users u ON sp.student_id = u.user_id 
                   AND (u.class_grade = m.grade_level OR m.grade_level IS NULL OR u.class_grade IS NULL)
                WHERE tc.teacher_id = p_teacher_id 
                  AND sp.completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(sp.completed_at)
                ORDER BY activity_date;
            END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `assignment_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `question_count` int(11) NOT NULL DEFAULT 10,
  `total_marks` int(11) NOT NULL DEFAULT 100,
  `passing_marks` int(11) DEFAULT 40,
  `time_limit_minutes` int(11) DEFAULT 30,
  `max_attempts` int(11) DEFAULT 3,
  `attempt_window_days` int(11) DEFAULT 7,
  `shuffle_questions` tinyint(1) DEFAULT 1,
  `show_results_immediately` tinyint(1) DEFAULT 1,
  `allow_review` tinyint(1) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignments`
--

INSERT INTO `assignments` (`assignment_id`, `part_id`, `title`, `description`, `question_count`, `total_marks`, `passing_marks`, `time_limit_minutes`, `max_attempts`, `attempt_window_days`, `shuffle_questions`, `show_results_immediately`, `allow_review`, `is_active`, `start_date`, `end_date`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 4, ' Quiz: Computer Basics', 'Complete this assignment to finish the unit.', 1, 10, 40, 15, 2, 7, 1, 1, 1, 1, NULL, NULL, 1, '2026-01-06 06:01:56', '2026-01-20 04:25:45'),
(3, 12, 'Internet Safety Quiz', NULL, 8, 16, 40, 20, 2, 7, 1, 1, 1, 1, NULL, NULL, 1, '2026-01-06 06:01:56', '2026-01-06 07:57:24'),
(12, 8, 'MS', 'Complete this assignment to finish the unit.', 10, 100, 40, 30, 3, 7, 1, 1, 1, 1, NULL, NULL, NULL, '2026-01-20 04:29:05', '2026-01-20 04:29:05');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_analysis`
--

CREATE TABLE `assignment_analysis` (
  `analysis_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `total_correct` int(11) DEFAULT 0,
  `total_questions` int(11) DEFAULT 0,
  `accuracy_percentage` decimal(5,2) DEFAULT NULL,
  `time_spent_seconds` int(11) DEFAULT NULL,
  `avg_time_per_question` decimal(5,2) DEFAULT NULL,
  `question_analysis_json` text DEFAULT NULL,
  `weak_topics_json` text DEFAULT NULL,
  `recommendation_json` text DEFAULT NULL,
  `analyzed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_attempts`
--

CREATE TABLE `assignment_attempts` (
  `attempt_id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `attempt_number` int(11) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NULL DEFAULT NULL,
  `status` enum('not_started','in_progress','completed','timed_out') DEFAULT 'not_started',
  `last_question_accessed` int(11) DEFAULT 0,
  `time_remaining_seconds` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignment_attempts`
--

INSERT INTO `assignment_attempts` (`attempt_id`, `assignment_id`, `student_id`, `attempt_number`, `start_time`, `end_time`, `status`, `last_question_accessed`, `time_remaining_seconds`) VALUES
(63, 1, 15, 1, '2026-03-05 03:58:22', '2026-03-05 03:58:44', 'completed', 0, 900);

-- --------------------------------------------------------

--
-- Stand-in structure for view `assignment_performance_view`
-- (See below for the actual view)
--
CREATE TABLE `assignment_performance_view` (
`assignment_id` int(11)
,`teacher_id` int(11)
,`module_id` int(11)
,`class_section` varchar(50)
,`assignment_ref_id` int(11)
,`assignment_title` varchar(200)
,`total_marks` int(11)
,`submissions_count` bigint(21)
,`avg_score` decimal(14,4)
,`passed_count` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Table structure for table `assignment_results`
--

CREATE TABLE `assignment_results` (
  `result_id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `best_score` int(11) DEFAULT 0,
  `best_percentage` decimal(5,2) DEFAULT NULL,
  `attempts_used` int(11) DEFAULT 0,
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  `passed` tinyint(1) DEFAULT 0,
  `completion_date` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assignment_results`
--

INSERT INTO `assignment_results` (`result_id`, `assignment_id`, `student_id`, `best_score`, `best_percentage`, `attempts_used`, `last_attempt_at`, `passed`, `completion_date`) VALUES
(34, 1, 15, 0, 0.00, 1, '2026-03-05 03:58:44', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `auth_activity_logs`
--

CREATE TABLE `auth_activity_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `activity_type` enum('login','logout','login_failed','password_change','account_locked') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_activity_logs`
--

INSERT INTO `auth_activity_logs` (`log_id`, `user_id`, `activity_type`, `ip_address`, `user_agent`, `details`, `created_at`) VALUES
(1, 2, 'login', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{\"method\": \"password\"}', '2026-01-06 06:01:56'),
(2, 3, 'login', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{\"method\": \"password\"}', '2026-01-06 06:01:56'),
(3, NULL, 'login', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{\"method\": \"password\"}', '2026-01-06 06:01:56'),
(4, NULL, 'login_failed', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{\"reason\": \"wrong_password\", \"username\": \"test_teacher\"}', '2026-01-06 06:01:56'),
(5, 3, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":4}', '2026-01-06 06:07:09'),
(6, 3, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":3}', '2026-01-06 06:08:06'),
(7, 7, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":4}', '2026-01-06 06:08:06'),
(8, 8, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":4}', '2026-01-06 06:08:06'),
(9, NULL, 'login_failed', '::1', 'axios/1.13.2', '{\"username\":\"nonexistent\",\"reason\":\"User not found\"}', '2026-01-06 06:08:06'),
(10, 3, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":2}', '2026-01-06 06:08:30'),
(11, 7, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":3}', '2026-01-06 06:08:30'),
(12, 8, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":3}', '2026-01-06 06:08:30'),
(13, NULL, 'login_failed', '::1', 'axios/1.13.2', '{\"username\":\"wronguser\",\"reason\":\"User not found\"}', '2026-01-06 06:08:30'),
(14, 3, 'login_failed', '::1', 'axios/1.13.2', '{\"reason\":\"Invalid password\",\"remainingAttempts\":1}', '2026-01-06 06:08:30'),
(15, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-01-06 06:08:30'),
(16, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-01-06 06:08:30'),
(17, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-01-06 06:08:30'),
(18, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-01-06 06:08:30'),
(19, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-01-06 06:08:30'),
(20, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-01-06 06:08:30'),
(21, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":856}', '2026-01-06 06:09:14'),
(22, 8, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":2}', '2026-01-06 06:09:17'),
(23, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 06:18:25'),
(24, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:14:52'),
(25, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:19:17'),
(26, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:23:58'),
(27, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:24:41'),
(28, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:28:19'),
(29, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:28:31'),
(30, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:35:59'),
(31, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:41:21'),
(32, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:43:10'),
(33, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:43:50'),
(34, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:45:56'),
(35, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:46:30'),
(36, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:48:36'),
(37, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\"}', '2026-01-06 08:51:03'),
(38, NULL, 'account_locked', '::1', 'axios/1.13.2', '{\"username\":\"test_student\",\"reason\":\"Too many failed attempts\"}', '2026-01-06 08:54:31'),
(39, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:55:56'),
(40, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:57:00'),
(41, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 08:58:07'),
(42, 8, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":1}', '2026-01-06 09:29:05'),
(43, 7, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":2}', '2026-01-06 09:29:21'),
(44, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 09:30:23'),
(45, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 09:38:34'),
(46, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-06 09:40:22'),
(47, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"username\":\"test_admin\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":220}', '2026-01-06 09:40:25'),
(48, 3, 'login', '127.0.0.1', 'test-script', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 09:48:44'),
(49, 7, 'login_failed', '127.0.0.1', 'test-script', '{\"reason\":\"Invalid password\",\"remainingAttempts\":1}', '2026-01-06 09:48:44'),
(50, 8, 'login_failed', '127.0.0.1', 'test-script', '{\"reason\":\"Invalid password\",\"remainingAttempts\":0}', '2026-01-06 09:48:44'),
(51, 3, 'login', '127.0.0.1', 'test-script', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 09:49:09'),
(52, NULL, 'account_locked', '127.0.0.1', 'test-script', '{\"username\":\"test_teacher\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":875}', '2026-01-06 09:49:09'),
(53, NULL, 'account_locked', '127.0.0.1', 'test-script', '{\"username\":\"test_admin\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":875}', '2026-01-06 09:49:09'),
(54, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 09:53:04'),
(55, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"username\":\"test_admin\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":227}', '2026-01-06 09:59:57'),
(56, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 10:00:17'),
(57, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"username\":\"test_admin\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":153}', '2026-01-06 10:01:11'),
(58, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"username\":\"test_teacher\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":149}', '2026-01-06 10:01:15'),
(59, 3, 'login', '127.0.0.1', 'test-script', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 10:05:57'),
(60, 7, 'login', '127.0.0.1', 'test-script', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-06 10:05:58'),
(61, 8, 'login_failed', '127.0.0.1', 'test-script', '{\"reason\":\"Invalid password\",\"remainingAttempts\":-1}', '2026-01-06 10:05:58'),
(62, 3, 'login', '127.0.0.1', 'test-script', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 10:10:18'),
(63, 7, 'login', '127.0.0.1', 'test-script', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-06 10:10:20'),
(64, 8, 'login', '127.0.0.1', 'test-script', '{\"role\":\"admin\",\"grade\":null}', '2026-01-06 10:10:23'),
(65, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-06 10:14:24'),
(66, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-06 10:14:44'),
(67, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-06 10:14:47'),
(68, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 10:15:10'),
(69, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-06 10:42:55'),
(70, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 03:48:40'),
(71, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-07 03:51:05'),
(72, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:00:01'),
(73, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:08:22'),
(74, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:25:53'),
(75, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:26:16'),
(76, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:26:38'),
(77, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:28:49'),
(78, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:29:01'),
(79, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:29:44'),
(80, 3, 'login', '::1', 'axios/1.13.2', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:30:49'),
(81, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 04:32:05'),
(82, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-07 05:34:16'),
(83, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 05:34:47'),
(84, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-07 05:49:05'),
(85, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 05:49:15'),
(86, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 08:19:22'),
(87, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 09:37:40'),
(88, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 09:47:45'),
(89, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 10:02:25'),
(90, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-07 10:13:04'),
(91, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-07 10:13:30'),
(92, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-08 03:06:17'),
(93, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-08 03:19:57'),
(94, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 03:20:01'),
(95, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-08 03:23:33'),
(96, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-08 03:27:23'),
(97, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 03:27:27'),
(98, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:09:53'),
(99, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:41:25'),
(100, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:45:10'),
(101, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:50:38'),
(102, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:56:39'),
(103, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:56:52'),
(104, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 04:59:32'),
(105, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:00:00'),
(106, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:01:38'),
(107, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:02:19'),
(108, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:02:58'),
(109, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:05:59'),
(110, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:06:55'),
(111, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:10:47'),
(112, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:11:14'),
(113, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:11:59'),
(114, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:13:10'),
(115, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:14:27'),
(116, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:14:49'),
(117, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:15:43'),
(118, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:16:09'),
(119, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:17:11'),
(120, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:18:34'),
(121, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 05:19:19'),
(122, 7, 'login', '::1', 'axios/1.13.2', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 06:41:08'),
(123, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 06:41:59'),
(124, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 06:42:16'),
(125, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 08:30:00'),
(126, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 09:06:38'),
(127, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-08 09:11:40'),
(128, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 09:11:55'),
(129, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 09:43:05'),
(130, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-08 09:43:09'),
(131, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-08 09:46:02'),
(132, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-08 09:46:08'),
(133, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 09:46:19'),
(134, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-08 09:46:33'),
(135, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-08 09:46:41'),
(136, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-09 05:02:20'),
(137, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 05:02:38'),
(138, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-09 05:02:41'),
(139, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 06:02:51'),
(140, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-09 06:03:40'),
(141, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 06:20:49'),
(142, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-09 06:21:04'),
(143, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 06:21:51'),
(144, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-09 06:21:54'),
(145, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 08:14:09'),
(146, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-09 08:14:13'),
(147, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 08:15:06'),
(148, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-09 08:15:08'),
(149, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 08:15:48'),
(150, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-09 08:16:41'),
(151, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-09 09:33:34'),
(152, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"created_user_id\":9,\"created_username\":\"umindu1\"}', '2026-01-09 09:47:31'),
(153, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"6\"}', '2026-01-09 10:08:25'),
(154, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-09 10:09:15'),
(155, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"full_name\",\"role\",\"class_grade\",\"roll_number\",\"subject\",\"is_active\"]}', '2026-01-09 10:18:43'),
(156, NULL, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"reason\":\"Account is inactive\"}', '2026-01-09 10:19:04'),
(157, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-09 10:19:14'),
(158, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"full_name\",\"role\",\"class_grade\",\"roll_number\",\"subject\",\"is_active\"]}', '2026-01-09 10:19:21'),
(159, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-09 10:30:31'),
(160, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-09 10:30:57'),
(161, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-09 10:31:20'),
(162, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-09 10:31:22'),
(163, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-09 10:32:05'),
(164, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-09 10:32:08'),
(165, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 03:26:54'),
(166, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-12 03:28:40'),
(167, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-12 03:28:45'),
(168, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-12 03:29:12'),
(169, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 03:40:49'),
(170, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-12 03:41:54'),
(171, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 08:22:38'),
(172, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-12 08:23:19'),
(173, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-12 08:23:24'),
(174, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-12 08:24:13'),
(175, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-12 08:24:18'),
(176, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 08:26:29'),
(177, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-12 08:26:46'),
(178, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 08:35:51'),
(179, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 08:43:36'),
(180, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-12 10:30:40'),
(181, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"6\"}', '2026-01-13 03:39:32'),
(182, NULL, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-13 03:40:04'),
(183, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-13 03:40:10'),
(184, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"full_name\",\"role\",\"class_grade\",\"roll_number\",\"subject\",\"is_active\"]}', '2026-01-13 03:42:12'),
(185, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-13 03:42:50'),
(186, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 03:44:15'),
(187, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-13 03:46:02'),
(188, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-13 03:48:17'),
(189, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 03:49:03'),
(190, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-13 03:49:38'),
(191, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"full_name\",\"role\",\"class_grade\",\"roll_number\",\"subject\",\"is_active\"]}', '2026-01-13 03:50:30'),
(192, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 03:53:29'),
(193, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-13 03:53:53'),
(194, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-13 03:53:58'),
(195, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 06:36:05'),
(196, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 06:36:23'),
(197, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', NULL, '2026-01-13 07:24:04'),
(198, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 08:43:20'),
(199, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-13 10:17:52'),
(200, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-16 06:42:42'),
(201, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 03:04:12'),
(202, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 03:36:30'),
(203, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 03:36:51'),
(204, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 03:37:29'),
(205, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 03:37:34'),
(206, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 03:38:06'),
(207, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 04:07:36'),
(208, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 04:33:25'),
(209, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"created_user_id\":10,\"created_username\":\"kalana\"}', '2026-01-19 04:33:59'),
(210, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"\"}', '2026-01-19 04:34:10'),
(211, NULL, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 04:35:28'),
(212, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"\"}', '2026-01-19 04:35:37'),
(213, NULL, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 04:35:59'),
(214, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 04:37:00'),
(215, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 04:42:59'),
(216, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 04:43:02'),
(217, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"10\",\"deleted_username\":\"kalana\"}', '2026-01-19 04:43:06'),
(218, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"10\",\"deleted_username\":\"kalana\"}', '2026-01-19 04:43:11'),
(219, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"10\",\"deleted_username\":\"kalana\"}', '2026-01-19 04:43:17'),
(220, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"10\",\"deleted_username\":\"kalana\"}', '2026-01-19 04:43:23'),
(221, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"1\",\"deleted_username\":\"admin001\"}', '2026-01-19 04:43:37'),
(222, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 04:49:19'),
(223, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 04:49:30'),
(224, NULL, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Account is inactive\"}', '2026-01-19 04:49:33'),
(225, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 04:49:44'),
(226, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"10\",\"changes\":[\"full_name\",\"role\",\"class_grade\",\"roll_number\",\"subject\",\"is_active\"]}', '2026-01-19 04:49:58'),
(227, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"10\",\"deleted_username\":\"kalana\"}', '2026-01-19 04:50:01'),
(228, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"created_user_id\":11,\"created_username\":\"lahiru\"}', '2026-01-19 04:50:39'),
(229, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"6\"}', '2026-01-19 04:51:48'),
(230, NULL, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 04:51:57'),
(231, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 04:54:50'),
(232, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:00:53'),
(233, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:00:54'),
(234, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:00:54'),
(235, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:00:55'),
(236, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:00:56'),
(237, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:00:56'),
(238, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"is_active\"]}', '2026-01-19 05:01:03'),
(239, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"is_active\"]}', '2026-01-19 05:01:04'),
(240, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"10\",\"deleted_username\":\"kalana\"}', '2026-01-19 05:03:06'),
(241, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:03:12'),
(242, NULL, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Account is inactive\"}', '2026-01-19 05:03:17'),
(243, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 05:03:22'),
(244, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"11\",\"changes\":[\"is_active\"]}', '2026-01-19 05:03:34'),
(245, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 05:39:50'),
(246, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-19 05:46:44'),
(247, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 05:54:34'),
(248, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 05:54:37'),
(249, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 05:58:48'),
(250, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 05:59:01'),
(251, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 05:59:16'),
(252, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"11\",\"deleted_username\":\"lahiru\"}', '2026-01-19 05:59:34'),
(253, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"created_user_id\":13,\"created_username\":\"lahiru\"}', '2026-01-19 05:59:46'),
(254, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"10\"}', '2026-01-19 06:00:37'),
(255, NULL, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 06:01:11'),
(256, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"6\"}', '2026-01-19 06:01:21'),
(257, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:01:34'),
(258, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 06:01:57'),
(259, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 06:02:12');
INSERT INTO `auth_activity_logs` (`log_id`, `user_id`, `activity_type`, `ip_address`, `user_agent`, `details`, `created_at`) VALUES
(260, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"9\",\"changes\":[\"full_name\",\"role\",\"class_grade\",\"roll_number\",\"subject\",\"is_active\"]}', '2026-01-19 06:02:28'),
(261, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"6\"}', '2026-01-19 06:02:40'),
(262, NULL, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":4}', '2026-01-19 06:04:23'),
(263, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:04:54'),
(264, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 06:05:03'),
(265, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"6\"}', '2026-01-19 06:05:09'),
(266, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 06:07:26'),
(267, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"created_user_id\":14,\"created_username\":\"umindu2\"}', '2026-01-19 06:07:44'),
(268, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"14\",\"deleted_username\":\"umindu2\"}', '2026-01-19 06:11:41'),
(269, NULL, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:11:54'),
(270, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 06:12:20'),
(271, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"13\",\"deleted_username\":\"lahiru\"}', '2026-01-19 06:12:24'),
(272, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"deleted_user_id\":\"9\",\"deleted_username\":\"umindu1\"}', '2026-01-19 06:12:26'),
(273, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"1\",\"changes\":[\"is_active\"]}', '2026-01-19 06:12:29'),
(274, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"created_user_id\":15,\"created_username\":\"umindu1\"}', '2026-01-19 06:14:01'),
(275, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:14:22'),
(276, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:16:22'),
(277, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-19 06:16:28'),
(278, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-19 06:31:02'),
(279, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-19 06:33:38'),
(280, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:35:27'),
(281, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-19 06:38:17'),
(282, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 06:38:45'),
(283, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 06:38:56'),
(284, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 07:55:27'),
(285, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 07:56:25'),
(286, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 07:56:49'),
(287, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 08:09:08'),
(288, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 08:10:14'),
(289, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 08:11:33'),
(290, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 08:11:35'),
(291, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 08:12:58'),
(292, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 08:14:20'),
(293, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 08:15:08'),
(294, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 08:16:16'),
(295, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 08:16:43'),
(296, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 08:17:15'),
(297, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 08:30:26'),
(298, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 08:32:57'),
(299, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 09:24:58'),
(300, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 09:25:11'),
(301, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 09:27:23'),
(302, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-19 10:30:51'),
(303, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-19 10:31:41'),
(304, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 02:59:16'),
(305, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 03:01:07'),
(306, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 03:19:56'),
(307, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 03:20:38'),
(308, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 03:56:03'),
(309, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 03:56:47'),
(310, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 03:58:09'),
(311, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:00:14'),
(312, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:00:41'),
(313, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:02:55'),
(314, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:04:33'),
(315, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:04:51'),
(316, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:05:40'),
(317, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:06:36'),
(318, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:08:06'),
(319, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:08:47'),
(320, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:11:20'),
(321, 8, 'login', '::1', 'axios/1.13.2', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 04:24:11'),
(322, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 05:07:50'),
(323, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 05:24:09'),
(324, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 05:37:26'),
(325, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 05:40:01'),
(326, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 05:41:38'),
(327, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 06:54:55'),
(328, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 06:54:58'),
(329, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 07:05:56'),
(330, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 07:12:01'),
(331, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 07:12:04'),
(332, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 07:38:32'),
(333, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 09:00:43'),
(334, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 09:39:25'),
(335, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 09:39:34'),
(336, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 09:47:51'),
(337, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 09:49:30'),
(338, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 09:57:01'),
(339, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 09:58:06'),
(340, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-20 09:58:20'),
(341, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 09:58:43'),
(342, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 10:00:17'),
(343, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 10:00:21'),
(344, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 10:00:23'),
(345, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 10:01:56'),
(346, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 10:02:12'),
(347, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-20 10:10:56'),
(348, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-20 10:16:03'),
(349, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 10:16:06'),
(350, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-20 10:16:18'),
(351, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-20 10:16:29'),
(352, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 03:00:38'),
(353, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 03:01:38'),
(354, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-21 03:01:51'),
(355, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"15\",\"changes\":[\"is_active\"]}', '2026-01-21 03:02:30'),
(356, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"15\",\"changes\":[\"is_active\"]}', '2026-01-21 03:02:31'),
(357, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"15\",\"changes\":[\"is_active\"]}', '2026-01-21 03:02:32'),
(358, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"updated_user_id\":\"15\",\"changes\":[\"is_active\"]}', '2026-01-21 03:02:33'),
(359, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 03:07:47'),
(360, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-21 03:07:51'),
(361, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 03:09:41'),
(362, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 03:09:45'),
(363, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 03:13:09'),
(364, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 06:43:20'),
(365, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 07:22:03'),
(366, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 09:27:14'),
(367, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 09:29:04'),
(368, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 09:31:57'),
(369, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-21 09:32:00'),
(370, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 09:35:23'),
(371, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 09:35:25'),
(372, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-21 09:36:04'),
(373, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-21 09:37:07'),
(374, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 09:37:13'),
(375, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 09:37:46'),
(376, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-21 09:37:50'),
(377, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-21 09:38:02'),
(378, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-21 09:51:50'),
(379, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-01-22 03:01:05'),
(380, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-22 05:00:20'),
(381, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-22 05:00:23'),
(382, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-22 05:01:43'),
(383, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-22 08:55:06'),
(384, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-22 08:55:32'),
(385, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-22 10:27:07'),
(386, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-22 10:28:53'),
(387, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-23 04:12:01'),
(388, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-23 04:14:10'),
(389, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 03:53:15'),
(390, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 03:55:43'),
(391, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 03:55:46'),
(392, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 03:55:49'),
(393, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 03:56:32'),
(394, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 06:26:11'),
(395, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 06:26:44'),
(396, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 06:26:46'),
(397, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 07:40:32'),
(398, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 07:42:00'),
(399, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"created_user_id\":16,\"created_username\":\"umindu12\"}', '2026-01-26 07:43:27'),
(400, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 07:44:06'),
(401, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 07:46:38'),
(402, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 07:46:43'),
(403, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 07:46:51'),
(404, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 07:50:40'),
(405, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 07:51:23'),
(406, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 07:54:52'),
(407, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 07:54:54'),
(408, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 07:55:25'),
(409, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 07:55:27'),
(410, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 07:55:29'),
(411, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 07:55:35'),
(412, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 07:56:35'),
(413, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 08:15:32'),
(414, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 08:16:38'),
(415, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 08:16:41'),
(416, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 08:19:22'),
(417, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 08:19:25'),
(418, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 08:19:35'),
(419, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-26 09:04:58'),
(420, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-26 09:06:24'),
(421, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-26 09:06:30'),
(422, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-28 03:34:56'),
(423, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-28 03:35:17'),
(424, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-28 03:36:17'),
(425, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-28 03:36:29'),
(426, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-28 03:37:15'),
(427, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-28 03:38:04'),
(428, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-28 03:38:06'),
(429, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-01-29 05:15:18'),
(430, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-01-29 05:17:28'),
(431, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-01-29 05:20:39'),
(432, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:21:15'),
(433, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 03:22:04'),
(434, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 03:23:06'),
(435, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:28:51'),
(436, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:39:29'),
(437, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 03:40:12'),
(438, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:40:13'),
(439, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:40:17'),
(440, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 03:40:50'),
(441, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:48:01'),
(442, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 03:48:06'),
(443, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:48:17'),
(444, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:51:05'),
(445, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 03:52:45'),
(446, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:52:47'),
(447, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:53:17'),
(448, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:53:28'),
(449, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:53:40'),
(450, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:53:43'),
(451, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 03:53:44'),
(452, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 03:53:47'),
(453, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 03:53:50'),
(454, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 03:54:15'),
(455, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:55:22'),
(456, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 03:55:34'),
(457, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 03:55:44'),
(458, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:55:51'),
(459, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:55:54'),
(460, 15, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":4}', '2026-02-06 03:56:08'),
(461, 15, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":3}', '2026-02-06 03:56:12'),
(462, 15, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":2}', '2026-02-06 03:56:13'),
(463, 15, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"reason\":\"Invalid password\",\"remainingAttempts\":1}', '2026-02-06 03:56:15'),
(464, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"username\":\"umindu1\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":900}', '2026-02-06 03:56:15'),
(465, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:56:31'),
(466, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:57:05'),
(467, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 03:58:21'),
(468, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 03:58:25'),
(469, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 03:58:28'),
(470, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:02:49'),
(471, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:02:58'),
(472, NULL, 'account_locked', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"username\":\"umindu1\",\"reason\":\"Too many failed attempts\",\"lockTimeRemaining\":496}', '2026-02-06 04:02:59'),
(473, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:03:02'),
(474, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:03:21'),
(475, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:03:25'),
(476, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:07:05'),
(477, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:07:10'),
(478, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:07:43'),
(479, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:08:03'),
(480, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:08:06'),
(481, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:08:08'),
(482, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:08:40'),
(483, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:08:42'),
(484, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:08:44'),
(485, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:15:07'),
(486, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:15:17'),
(487, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:15:32'),
(488, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:16:22'),
(489, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:23:36'),
(490, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:23:50'),
(491, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:24:27'),
(492, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:24:29'),
(493, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:25:35'),
(494, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:28:50'),
(495, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:29:13'),
(496, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:29:27'),
(497, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:29:42');
INSERT INTO `auth_activity_logs` (`log_id`, `user_id`, `activity_type`, `ip_address`, `user_agent`, `details`, `created_at`) VALUES
(498, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:29:45'),
(499, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:29:51'),
(500, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:29:54'),
(501, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:29:57'),
(502, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:31:12'),
(503, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:31:16'),
(504, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:31:21'),
(505, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:31:32'),
(506, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:32:23'),
(507, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:32:25'),
(508, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:32:30'),
(509, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:32:32'),
(510, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:32:33'),
(511, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:35:30'),
(512, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:35:50'),
(513, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:35:52'),
(514, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:35:53'),
(515, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:35:55'),
(516, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:35:58'),
(517, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:36:01'),
(518, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:37:20'),
(519, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:37:23'),
(520, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:37:25'),
(521, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:37:27'),
(522, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:37:29'),
(523, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:37:44'),
(524, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:37:45'),
(525, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:37:48'),
(526, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:37:49'),
(527, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-06 04:37:51'),
(528, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:37:53'),
(529, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:40:24'),
(530, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:40:32'),
(531, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-06 04:40:36'),
(532, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:40:41'),
(533, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-06 04:40:53'),
(534, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-06 04:40:59'),
(535, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-09 03:41:29'),
(536, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-09 03:42:10'),
(537, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-09 03:43:16'),
(538, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-09 03:43:18'),
(539, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-09 03:46:51'),
(540, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-09 03:46:55'),
(541, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-09 03:47:27'),
(542, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-09 03:48:14'),
(543, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-09 06:41:08'),
(544, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-12 04:50:02'),
(545, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', NULL, '2026-02-12 05:05:26'),
(546, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-12 05:05:28'),
(547, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-18 03:53:18'),
(548, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-18 03:57:06'),
(549, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-18 03:57:17'),
(550, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-18 03:57:23'),
(551, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-18 03:57:29'),
(552, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-18 04:45:50'),
(553, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-18 04:46:01'),
(554, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-18 04:54:01'),
(555, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-18 04:54:04'),
(556, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-18 04:55:36'),
(557, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-26 03:56:41'),
(558, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 03:57:12'),
(559, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-26 04:00:32'),
(560, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-26 04:27:32'),
(561, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-26 04:28:28'),
(562, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 04:35:43'),
(563, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-26 04:36:53'),
(564, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 04:40:01'),
(565, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-26 04:57:11'),
(566, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-26 04:57:31'),
(567, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 04:57:36'),
(568, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-26 04:57:39'),
(569, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 04:57:41'),
(570, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-02-26 04:57:43'),
(571, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 04:57:45'),
(572, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-02-26 04:57:48'),
(573, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-02-26 04:57:51'),
(574, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-02-26 04:57:54'),
(575, 3, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 03:12:18'),
(576, 3, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-04 03:12:46'),
(577, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 04:15:42'),
(578, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 05:59:44'),
(579, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-04 06:06:31'),
(580, NULL, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"username\":\"Admin\",\"reason\":\"User not found\"}', '2026-03-04 06:06:54'),
(581, NULL, 'login_failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"username\":\"admin\",\"reason\":\"User not found\"}', '2026-03-04 06:07:00'),
(582, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-03-04 06:07:31'),
(583, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-04 06:09:07'),
(584, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 06:09:11'),
(585, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-04 06:18:26'),
(586, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 06:29:13'),
(587, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-04 07:29:27'),
(588, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 07:29:29'),
(589, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 07:29:32'),
(590, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-04 07:53:52'),
(591, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-04 07:57:59'),
(592, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-05 03:56:22'),
(593, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-05 07:12:56'),
(594, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-03-05 07:13:10'),
(595, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-03-05 07:13:19'),
(596, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-03-05 07:14:05'),
(597, 7, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"teacher\",\"grade\":null}', '2026-03-05 07:14:22'),
(598, 7, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-05 07:16:38'),
(599, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-09 03:47:02'),
(600, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-03-09 03:48:26'),
(601, 8, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"admin\",\"grade\":null}', '2026-03-09 03:48:38'),
(602, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"deleted_user_id\":\"6\",\"deleted_username\":\"stu_6_003\"}', '2026-03-09 03:49:56'),
(603, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"deleted_user_id\":\"5\",\"deleted_username\":\"stu_6_002\"}', '2026-03-09 03:49:59'),
(604, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"deleted_user_id\":\"4\",\"deleted_username\":\"stu_6_001\"}', '2026-03-09 03:50:02'),
(605, 8, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"deleted_user_id\":\"16\",\"deleted_username\":\"umindu12\"}', '2026-03-09 03:50:33'),
(606, 8, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-09 03:50:47'),
(607, 15, 'login', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '{\"role\":\"student\",\"grade\":\"Grade 6\"}', '2026-03-09 03:50:51'),
(608, 15, 'logout', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', NULL, '2026-03-09 03:51:34');

-- --------------------------------------------------------

--
-- Stand-in structure for view `class_performance_view`
-- (See below for the actual view)
--
CREATE TABLE `class_performance_view` (
`assignment_id` int(11)
,`teacher_id` int(11)
,`module_id` int(11)
,`class_section` varchar(50)
,`activity_date` date
,`active_students` bigint(21)
,`completed_items` bigint(21)
,`avg_score` decimal(14,4)
);

-- --------------------------------------------------------

--
-- Table structure for table `content_access_logs`
--

CREATE TABLE `content_access_logs` (
  `access_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `action_type` enum('view','download','preview','complete') NOT NULL,
  `access_duration_seconds` int(11) DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `accessed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `content_access_logs`
--

INSERT INTO `content_access_logs` (`access_id`, `user_id`, `part_id`, `action_type`, `access_duration_seconds`, `device_info`, `ip_address`, `accessed_at`) VALUES
(3, 3, 9, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-06 06:31:49'),
(4, 3, 9, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-06 06:31:49'),
(5, 3, 5, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-06 06:31:58'),
(6, 3, 5, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-06 06:31:58'),
(15, 3, 4, 'view', NULL, 'axios/1.13.2', '::1', '2026-01-06 08:57:01'),
(16, 3, 4, 'view', NULL, 'axios/1.13.2', '::1', '2026-01-06 08:58:07'),
(19, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:28'),
(20, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:28'),
(21, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:29'),
(22, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:29'),
(23, 3, 12, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:33'),
(24, 3, 12, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:33'),
(25, 3, 12, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:33'),
(26, 3, 12, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 04:34:33'),
(29, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:37:05'),
(30, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:37:05'),
(31, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:37:05'),
(32, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:37:05'),
(33, 3, 8, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:37:08'),
(34, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:56:58'),
(35, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:56:59'),
(36, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:57:00'),
(37, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:57:00'),
(38, 3, 8, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 05:57:07'),
(39, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:43:13'),
(40, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:43:13'),
(41, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:43:13'),
(42, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:43:13'),
(43, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:44:04'),
(44, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:44:04'),
(45, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:44:04'),
(46, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 06:44:04'),
(52, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 08:21:23'),
(53, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 08:21:23'),
(54, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 08:21:24'),
(55, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 08:21:24'),
(61, 3, 5, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:04:16'),
(62, 3, 5, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:04:16'),
(67, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:28:57'),
(68, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:28:57'),
(69, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:28:58'),
(70, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:28:58'),
(71, 3, 8, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 09:29:00'),
(72, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 10:06:46'),
(73, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 10:06:46'),
(76, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 10:19:12'),
(77, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-07 10:19:12'),
(80, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:06:58'),
(81, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:06:58'),
(82, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:07:27'),
(83, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:07:27'),
(84, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:07:40'),
(85, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:07:40'),
(88, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:09'),
(89, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:09'),
(90, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:09'),
(91, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:09'),
(92, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:12'),
(93, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:42'),
(94, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:42'),
(95, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:42'),
(96, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:08:42'),
(105, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:24:34'),
(106, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:24:34'),
(107, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 03:24:35'),
(108, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:31'),
(109, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:31'),
(110, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:31'),
(111, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:31'),
(112, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:45'),
(113, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:45'),
(114, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:45'),
(115, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-08 09:45:45'),
(120, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-13 03:45:41'),
(121, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-13 03:45:42'),
(122, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:43:35'),
(123, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:43:35'),
(124, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:43:35'),
(125, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:43:35'),
(126, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:47:43'),
(127, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:47:43'),
(128, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0', '::1', '2026-01-16 06:47:43'),
(129, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 06:36:08'),
(130, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 06:36:08'),
(131, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 06:36:09'),
(132, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 06:36:09'),
(133, 15, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 06:38:04'),
(134, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 07:57:09'),
(135, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 07:57:09'),
(136, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 07:57:43'),
(137, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 07:57:43'),
(138, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:06:14'),
(139, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:08:49'),
(140, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:08:49'),
(146, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:14:37'),
(147, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:14:37'),
(148, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:16:28'),
(149, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:16:28'),
(150, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:17:29'),
(151, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:17:29'),
(152, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:22:02'),
(153, 3, 14, 'view', NULL, NULL, '::1', '2026-01-19 08:24:55'),
(154, 3, 14, 'view', NULL, NULL, '::1', '2026-01-19 08:25:26'),
(155, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:28:41'),
(156, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:28:56'),
(157, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:14'),
(158, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:14'),
(159, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:14'),
(160, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:14'),
(163, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:51'),
(164, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:51'),
(165, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:51'),
(166, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:34:51'),
(167, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:35:00'),
(168, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:35:00'),
(169, 3, 14, 'download', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:35:05'),
(170, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:35:20'),
(171, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:35:33'),
(172, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:36:03'),
(173, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:36:03'),
(174, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 08:45:36'),
(175, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:14:35'),
(176, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:24:24'),
(177, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:27:32'),
(178, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:27:32'),
(179, 3, 14, 'download', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:27:34'),
(180, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:27:47'),
(181, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:59:26'),
(182, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 09:59:34'),
(183, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:02:58'),
(184, 3, 14, 'download', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:03:01'),
(185, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:03:05'),
(186, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:14:23'),
(187, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:15:10'),
(188, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:15:10'),
(189, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:15:10'),
(190, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:15:10'),
(191, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:29:58'),
(192, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:29:58'),
(193, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:29:58'),
(194, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:12'),
(195, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:12'),
(196, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:12'),
(197, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:13'),
(201, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:37'),
(202, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:37'),
(203, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:37'),
(204, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-19 10:32:37'),
(205, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:00:02'),
(206, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:00:02'),
(207, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:00:08'),
(208, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:00:08'),
(209, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:00:08'),
(210, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:00:08'),
(213, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:14'),
(214, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:14'),
(215, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:14'),
(216, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:14'),
(217, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:27'),
(218, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:27'),
(219, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:27'),
(220, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 03:20:27'),
(221, 8, 13, 'view', NULL, 'axios/1.13.2', '::1', '2026-01-20 04:08:47'),
(222, 8, 13, 'view', NULL, 'axios/1.13.2', '::1', '2026-01-20 04:11:20'),
(223, 8, 13, 'view', NULL, 'axios/1.13.2', '::1', '2026-01-20 04:24:11'),
(224, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:08:13'),
(225, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:08:13'),
(226, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:08:13'),
(227, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:08:13'),
(228, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:10:20'),
(229, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:10:20'),
(230, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:10:43'),
(231, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:10:43'),
(232, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:10:47'),
(235, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:01'),
(236, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:02'),
(237, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:07'),
(238, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:12'),
(239, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:12'),
(240, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:19'),
(241, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:19'),
(242, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:19'),
(243, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:19'),
(244, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:11:31'),
(245, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:12:07'),
(246, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:12:07'),
(247, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:12:07'),
(248, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:12:07'),
(249, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:13:03'),
(250, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:13:03'),
(251, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:13:04'),
(252, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:13:04'),
(255, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:14:54'),
(256, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:14:54'),
(257, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:14:54'),
(258, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:14:54'),
(259, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:29'),
(260, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:34'),
(261, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:34'),
(262, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:34'),
(263, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:34'),
(264, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:36'),
(265, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:39'),
(266, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:39'),
(267, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:39'),
(268, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:39'),
(269, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:48'),
(270, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:48'),
(271, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:48'),
(272, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:15:48'),
(273, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:17:21'),
(274, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:17:22'),
(275, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:17:22'),
(276, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:18:20'),
(277, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:18:20'),
(278, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:18:20'),
(279, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:18:20'),
(280, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:20:34'),
(281, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:20:34'),
(282, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:20:34'),
(283, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:20:34'),
(284, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:20:43'),
(285, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:21:17'),
(286, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:22:31'),
(287, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:22:31'),
(288, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:22:31'),
(289, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:37:49'),
(290, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:37:49'),
(291, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:37:55'),
(292, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:37:56'),
(293, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:37:56'),
(294, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:37:56'),
(295, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:00'),
(296, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:00'),
(297, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:17'),
(298, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:17'),
(299, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:21'),
(300, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:21'),
(301, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:22'),
(302, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:24'),
(303, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:38:24'),
(304, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:39:57'),
(305, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:41:52'),
(306, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:41:52'),
(307, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:43:49'),
(308, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:43:49'),
(309, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:44:19'),
(310, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:44:19'),
(311, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:44:19'),
(312, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:44:19'),
(313, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:07'),
(314, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:07'),
(315, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:08'),
(316, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:10'),
(317, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:10'),
(318, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:11'),
(319, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:13'),
(320, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:13'),
(321, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:13'),
(322, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:13'),
(323, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:14'),
(324, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:19'),
(325, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:19'),
(326, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:20'),
(327, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:20'),
(328, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:23'),
(329, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:23'),
(330, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:26'),
(331, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:26'),
(332, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:45'),
(333, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:45'),
(334, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:48'),
(335, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:48'),
(336, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:48');
INSERT INTO `content_access_logs` (`access_id`, `user_id`, `part_id`, `action_type`, `access_duration_seconds`, `device_info`, `ip_address`, `accessed_at`) VALUES
(337, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:53'),
(338, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:53'),
(339, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:56'),
(340, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:56'),
(341, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:51:57'),
(342, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:53:07'),
(343, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:53:07'),
(344, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:55:38'),
(345, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:55:54'),
(346, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:56:21'),
(347, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:56:21'),
(348, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:56:26'),
(349, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:56:26'),
(350, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:56:44'),
(351, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:56:44'),
(352, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:59:16'),
(353, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:59:21'),
(354, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:59:21'),
(355, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 05:59:22'),
(356, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:20'),
(357, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:20'),
(358, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:33'),
(359, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:34'),
(360, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:34'),
(361, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:50'),
(362, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:02:50'),
(363, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:03:42'),
(364, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:04:00'),
(365, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:04:02'),
(366, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:04:05'),
(367, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:04:05'),
(368, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 06:05:38'),
(369, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:35'),
(370, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:35'),
(371, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:36'),
(372, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:38'),
(373, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:38'),
(374, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:39'),
(375, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:39'),
(376, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:39'),
(377, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:45'),
(378, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:45'),
(379, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:45'),
(380, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:45'),
(381, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:54'),
(382, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:54'),
(383, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:54'),
(384, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:54'),
(385, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:06:54'),
(386, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:02'),
(387, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:02'),
(388, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:02'),
(389, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:02'),
(390, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:04'),
(391, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:04'),
(392, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:06'),
(393, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 07:07:06'),
(394, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 09:44:49'),
(395, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 09:44:49'),
(396, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 09:44:49'),
(397, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 09:44:49'),
(398, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 10:19:27'),
(399, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 10:19:27'),
(400, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 10:19:28'),
(401, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-20 10:19:28'),
(402, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:05'),
(403, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:05'),
(404, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:12'),
(405, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:12'),
(406, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:21'),
(407, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:22'),
(408, 3, 14, 'download', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:01:25'),
(409, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:17'),
(410, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:17'),
(411, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:21'),
(412, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:25'),
(413, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:25'),
(414, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:35'),
(415, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:37'),
(416, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:37'),
(417, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:42'),
(418, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:42'),
(419, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:42'),
(420, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:42'),
(421, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:44'),
(422, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:44'),
(423, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:45'),
(424, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:47'),
(425, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:47'),
(426, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:47'),
(427, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:10:47'),
(428, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:11:08'),
(429, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:12:39'),
(430, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:12:39'),
(431, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:12:39'),
(432, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 03:12:39'),
(433, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:02'),
(434, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:02'),
(435, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:02'),
(436, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:02'),
(437, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:26'),
(438, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:26'),
(439, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:26'),
(440, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:44:26'),
(441, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:45:08'),
(442, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:45:08'),
(443, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:45:08'),
(444, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:24'),
(445, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:24'),
(446, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:24'),
(447, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:24'),
(448, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:30'),
(449, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:38'),
(450, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:38'),
(451, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:38'),
(452, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:38'),
(453, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:47:43'),
(454, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:07'),
(455, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:07'),
(456, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:07'),
(457, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:08'),
(458, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:31'),
(459, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:31'),
(460, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:31'),
(461, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:48:31'),
(462, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:50:32'),
(463, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:50:32'),
(464, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:50:32'),
(465, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:50:32'),
(466, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:12'),
(467, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:12'),
(468, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:15'),
(469, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:15'),
(470, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:15'),
(471, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:16'),
(472, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:23'),
(473, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:26'),
(474, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:26'),
(475, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:26'),
(476, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:26'),
(477, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:36'),
(478, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:37'),
(479, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:37'),
(480, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:37'),
(481, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:41'),
(482, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:41'),
(483, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:41'),
(484, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:44'),
(485, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:44'),
(486, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:59'),
(487, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:53:59'),
(488, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 06:54:00'),
(489, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:45'),
(490, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:45'),
(491, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:45'),
(492, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:45'),
(493, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:57'),
(494, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:57'),
(495, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:02:57'),
(496, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:00'),
(497, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:00'),
(498, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:00'),
(499, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:00'),
(500, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:16'),
(501, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:16'),
(502, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:16'),
(503, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:03:16'),
(504, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:39'),
(505, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:39'),
(506, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:39'),
(507, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:39'),
(508, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:49'),
(509, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:49'),
(510, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:49'),
(511, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:05:49'),
(512, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:18'),
(513, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:18'),
(514, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:18'),
(515, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:18'),
(516, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:35'),
(517, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:35'),
(518, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:35'),
(519, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:35'),
(520, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:55'),
(521, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:55'),
(522, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:55'),
(523, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:08:55'),
(524, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:09:18'),
(525, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:09:18'),
(526, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:09:18'),
(527, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:09:18'),
(528, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:09:28'),
(529, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:12:09'),
(530, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:12:09'),
(531, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:12:09'),
(532, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:12:09'),
(533, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:14:05'),
(534, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:14:05'),
(535, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:14:05'),
(536, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:14:05'),
(537, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:41'),
(538, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:41'),
(539, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:41'),
(540, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:47'),
(541, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:47'),
(542, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:47'),
(543, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:16:47'),
(544, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:17:03'),
(545, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:17:03'),
(546, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:17:03'),
(547, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:17:03'),
(548, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:18:30'),
(549, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:18:30'),
(550, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:18:30'),
(551, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:18:30'),
(552, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:20:37'),
(553, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:18'),
(554, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:18'),
(555, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:18'),
(556, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:18'),
(557, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:41'),
(558, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:41'),
(559, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:41'),
(560, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:22:41'),
(561, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:23:15'),
(562, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:23:15'),
(563, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:23:15'),
(564, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:23:16'),
(565, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:30:24'),
(566, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:30:24'),
(567, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:30:24'),
(568, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:30:24'),
(569, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:33:58'),
(570, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:33:58'),
(571, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:33:58'),
(572, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:33:58'),
(573, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:34:45'),
(574, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:34:45'),
(575, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:34:46'),
(576, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:34:46'),
(577, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:35:02'),
(578, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:35:02'),
(579, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:35:02'),
(580, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 07:35:02'),
(581, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:18'),
(582, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:18'),
(583, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:18'),
(584, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:18'),
(585, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:30'),
(586, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:30'),
(587, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:30'),
(588, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:30'),
(589, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:50'),
(590, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:50'),
(591, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:50'),
(592, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:11:50'),
(593, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:13:17'),
(594, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:13:21'),
(595, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:13:21'),
(596, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:13:21'),
(597, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:26:41'),
(598, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:26:41'),
(599, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:26:41'),
(600, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-21 09:26:41'),
(601, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 08:56:04'),
(602, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 08:56:04'),
(603, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 08:56:04'),
(604, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 08:56:04'),
(605, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:27:39'),
(606, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:27:39');
INSERT INTO `content_access_logs` (`access_id`, `user_id`, `part_id`, `action_type`, `access_duration_seconds`, `device_info`, `ip_address`, `accessed_at`) VALUES
(607, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:27:39'),
(608, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:27:40'),
(609, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:32:49'),
(610, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:32:49'),
(611, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:32:49'),
(612, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:32:49'),
(613, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:33:37'),
(614, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:33:47'),
(615, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:33:47'),
(616, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:33:47'),
(617, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:33:48'),
(618, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:38:51'),
(619, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:38:51'),
(620, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:38:51'),
(621, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:38:51'),
(622, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:11'),
(623, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:11'),
(624, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:11'),
(625, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:11'),
(626, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:31'),
(627, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:31'),
(628, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:31'),
(629, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:39:31'),
(630, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:30'),
(631, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:30'),
(632, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:30'),
(633, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:30'),
(634, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:55'),
(635, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:55'),
(636, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:55'),
(637, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:42:55'),
(638, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:43:15'),
(639, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:43:15'),
(640, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:43:15'),
(641, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-22 10:43:15'),
(642, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:25'),
(643, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:25'),
(644, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:25'),
(645, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:25'),
(646, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:46'),
(647, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:46'),
(648, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:46'),
(649, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:12:46'),
(650, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:15'),
(651, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:15'),
(652, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:15'),
(653, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:15'),
(654, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:32'),
(655, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:32'),
(656, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:32'),
(657, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:14:32'),
(658, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:15:37'),
(659, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:15:37'),
(660, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:15:37'),
(661, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:00'),
(662, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:00'),
(663, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:35'),
(664, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:35'),
(665, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:35'),
(666, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:35'),
(667, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:52'),
(668, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:52'),
(669, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:16:53'),
(670, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:14'),
(671, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:14'),
(672, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:14'),
(673, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:14'),
(674, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:26'),
(675, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:26'),
(676, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:17:26'),
(677, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:19:41'),
(678, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:04'),
(679, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:04'),
(680, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:04'),
(681, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:04'),
(682, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:12'),
(683, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:12'),
(684, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:20:12'),
(685, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:02'),
(686, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:02'),
(687, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:02'),
(688, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:02'),
(689, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:19'),
(690, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:19'),
(691, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:19'),
(692, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:19'),
(693, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:38'),
(694, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:38'),
(695, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:38'),
(696, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:22:38'),
(697, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:28:35'),
(698, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:28:35'),
(699, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:28:35'),
(700, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:28:35'),
(701, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:31:41'),
(702, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:31:41'),
(703, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:31:41'),
(704, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:31:41'),
(705, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:25'),
(706, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:26'),
(707, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:26'),
(708, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:35'),
(709, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:35'),
(710, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:35'),
(711, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:54'),
(712, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:54'),
(713, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:32:55'),
(714, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:33:29'),
(715, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:33:29'),
(716, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:33:29'),
(717, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:33:29'),
(718, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:35:48'),
(719, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:35:48'),
(720, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:35:48'),
(721, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:35:48'),
(722, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:36:39'),
(723, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:36:39'),
(724, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:36:39'),
(725, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:36:39'),
(726, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:37:30'),
(727, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:37:30'),
(728, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:37:30'),
(729, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:37:30'),
(730, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:21'),
(731, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:21'),
(732, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:22'),
(733, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:22'),
(734, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:52'),
(735, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:52'),
(736, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:52'),
(737, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:38:52'),
(738, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:39:29'),
(739, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:39:31'),
(740, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:00'),
(741, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:00'),
(742, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:00'),
(743, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:00'),
(744, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:01'),
(745, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:10'),
(746, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:10'),
(747, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:40:10'),
(748, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:41:27'),
(749, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:41:27'),
(750, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:41:27'),
(751, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:41:27'),
(752, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:43:08'),
(753, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:43:08'),
(754, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:43:08'),
(755, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:43:08'),
(756, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:20'),
(757, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:20'),
(758, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:20'),
(759, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:20'),
(760, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:40'),
(761, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:40'),
(762, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:40'),
(763, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:44:40'),
(764, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:04'),
(765, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:04'),
(766, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:04'),
(767, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:04'),
(768, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:49'),
(769, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:49'),
(770, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:49'),
(771, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:49'),
(772, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:57'),
(773, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:57'),
(774, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:57'),
(775, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 04:49:57'),
(776, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:03:22'),
(777, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:03:22'),
(778, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:03:22'),
(779, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:03:22'),
(780, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:04:05'),
(781, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:04:05'),
(782, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:04:05'),
(783, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-23 05:04:05'),
(784, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 03:54:44'),
(785, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 03:54:44'),
(786, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 03:54:44'),
(787, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 03:54:44'),
(788, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:48:00'),
(789, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:48:00'),
(790, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:48:11'),
(791, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:48:11'),
(792, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:48:22'),
(793, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:48:23'),
(794, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:01'),
(795, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:01'),
(796, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:01'),
(797, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:01'),
(798, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:33'),
(799, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:33'),
(800, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:33'),
(801, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:49:33'),
(802, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:50:49'),
(803, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:50:49'),
(804, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:50:50'),
(805, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 07:50:50'),
(806, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 08:17:43'),
(807, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 08:17:43'),
(808, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 09:07:14'),
(809, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 09:07:14'),
(810, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 09:07:14'),
(811, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-26 09:07:14'),
(812, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:15:51'),
(813, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:15:51'),
(814, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:15:57'),
(815, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:15:57'),
(816, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:16:15'),
(817, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:16:15'),
(818, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:16:15'),
(819, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-01-29 05:16:15'),
(820, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-06 03:51:56'),
(821, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-06 03:51:56'),
(822, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-06 03:51:56'),
(823, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-06 03:51:56'),
(824, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:43:37'),
(825, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:43:37'),
(826, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:43:42'),
(827, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:43:42'),
(828, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:43:57'),
(829, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:43:57'),
(830, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:06'),
(831, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:06'),
(832, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:07'),
(833, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:07'),
(834, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:45'),
(835, 3, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:45'),
(836, 3, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:46'),
(837, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:53'),
(838, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:53'),
(839, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:54'),
(840, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:57'),
(841, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:57'),
(842, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:57'),
(843, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:59'),
(844, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:59'),
(845, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:59'),
(846, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:44:59'),
(847, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:06'),
(848, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:06'),
(849, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:06'),
(850, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:06'),
(851, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:06'),
(852, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:12'),
(853, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:12'),
(854, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:12'),
(855, 3, 8, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:12'),
(856, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:20'),
(857, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:20'),
(858, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:20'),
(859, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:20'),
(860, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:35'),
(861, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:35'),
(862, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:35'),
(863, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:35'),
(864, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:36'),
(865, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:41'),
(866, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:41'),
(867, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:41'),
(868, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:41'),
(869, 3, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:42'),
(870, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:50'),
(871, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:50'),
(872, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:50'),
(873, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', '::1', '2026-02-09 03:45:50'),
(874, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:54:50'),
(875, 3, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:54:50'),
(876, 3, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:55:04');
INSERT INTO `content_access_logs` (`access_id`, `user_id`, `part_id`, `action_type`, `access_duration_seconds`, `device_info`, `ip_address`, `accessed_at`) VALUES
(877, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:55:08'),
(878, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:55:08'),
(879, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:55:08'),
(880, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-18 04:55:08'),
(881, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:28:07'),
(882, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:28:07'),
(883, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:28:07'),
(884, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:28:07'),
(885, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:28:15'),
(886, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:28:15'),
(887, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:37:10'),
(888, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:37:10'),
(889, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:37:11'),
(890, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:37:25'),
(891, 3, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:37:25'),
(892, 3, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:37:26'),
(893, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:09'),
(894, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:09'),
(895, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:09'),
(896, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:09'),
(897, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:19'),
(898, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:19'),
(899, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:19'),
(900, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:19'),
(901, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:52'),
(902, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:52'),
(903, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:38:52'),
(904, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:06'),
(905, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:06'),
(906, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:06'),
(907, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:06'),
(908, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:30'),
(909, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:30'),
(910, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:30'),
(911, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:30'),
(912, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:36'),
(913, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:36'),
(914, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:36'),
(915, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:36'),
(916, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:39'),
(917, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:39'),
(918, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:40'),
(919, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:40'),
(920, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:44'),
(921, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:44'),
(922, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:44'),
(923, 3, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-02-26 04:39:44'),
(924, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:01:31'),
(925, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:01:31'),
(926, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:09:35'),
(927, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:09:35'),
(928, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:10:24'),
(929, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:10:24'),
(930, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:12:57'),
(931, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:12:57'),
(932, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:13:14'),
(933, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:13:18'),
(934, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:13:18'),
(935, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:13:23'),
(936, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:13:23'),
(937, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:14:05'),
(938, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:14:05'),
(939, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:14:05'),
(940, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:14:05'),
(941, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:32'),
(942, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:32'),
(943, 15, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:34'),
(944, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:42'),
(945, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:42'),
(946, 15, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:43'),
(947, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:46'),
(948, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:46'),
(949, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:47'),
(950, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:53'),
(951, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:53'),
(952, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:53'),
(953, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:31:53'),
(954, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:17'),
(955, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:17'),
(956, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:17'),
(957, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:25'),
(958, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:25'),
(959, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:25'),
(960, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:25'),
(961, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:40'),
(962, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:40'),
(963, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:32:40'),
(964, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:33:09'),
(965, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:33:09'),
(966, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 06:33:09'),
(967, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:14:19'),
(968, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:14:20'),
(969, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:14:20'),
(970, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:14:36'),
(971, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:14:36'),
(972, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:14:36'),
(973, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:17:04'),
(974, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:17:04'),
(975, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:17:04'),
(976, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:28:26'),
(977, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:28:27'),
(978, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:28:27'),
(979, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:28:53'),
(980, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:28:53'),
(981, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:28:53'),
(982, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:53:46'),
(983, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:53:46'),
(984, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:53:46'),
(985, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-04 07:53:46'),
(986, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:57:12'),
(987, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:57:12'),
(988, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:57:12'),
(989, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:57:12'),
(990, 15, 4, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:57:31'),
(991, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:19'),
(992, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:19'),
(993, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:19'),
(994, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:19'),
(995, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:52'),
(996, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:52'),
(997, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 03:58:52'),
(998, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:02:57'),
(999, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:02:57'),
(1000, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:08'),
(1001, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:08'),
(1002, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:37'),
(1003, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:37'),
(1004, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:40'),
(1005, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:40'),
(1006, 15, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:03:53'),
(1007, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:00'),
(1008, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:00'),
(1009, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:07'),
(1010, 15, 13, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:07'),
(1011, 15, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:34'),
(1012, 15, 13, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:34'),
(1013, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:38'),
(1014, 15, 14, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:38'),
(1015, 15, 14, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:41'),
(1016, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:44'),
(1017, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:44'),
(1018, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:51'),
(1019, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:51'),
(1020, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:54'),
(1021, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:54'),
(1022, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:59'),
(1023, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:04:59'),
(1024, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:04'),
(1025, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:04'),
(1026, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:24'),
(1027, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:24'),
(1028, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:33'),
(1029, 15, 15, 'complete', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:34'),
(1030, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:37'),
(1031, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:37'),
(1032, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:56'),
(1033, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:56'),
(1034, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:56'),
(1035, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-05 04:05:56'),
(1036, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-09 03:48:14'),
(1037, 15, 15, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-09 03:48:14'),
(1038, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-09 03:51:18'),
(1039, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-09 03:51:18'),
(1040, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-09 03:51:18'),
(1041, 15, 4, 'view', NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '::1', '2026-03-09 03:51:18');

-- --------------------------------------------------------

--
-- Table structure for table `content_metadata`
--

CREATE TABLE `content_metadata` (
  `metadata_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size_bytes` bigint(20) NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `storage_provider` varchar(50) DEFAULT 'company_server',
  `checksum` varchar(64) DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `upload_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_accessed` timestamp NULL DEFAULT NULL,
  `access_count` int(11) DEFAULT 0,
  `is_encrypted` tinyint(1) DEFAULT 0,
  `encryption_key` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `content_metadata`
--

INSERT INTO `content_metadata` (`metadata_id`, `part_id`, `file_name`, `mime_type`, `file_size_bytes`, `storage_path`, `storage_provider`, `checksum`, `uploaded_by`, `upload_date`, `last_accessed`, `access_count`, `is_encrypted`, `encryption_key`) VALUES
(5, 14, '1768814824881-833993133.mp4', 'video/mp4', 6397436, '1768814824881-833993133.mp4', 'local', NULL, 1, '2026-01-19 09:22:31', '2026-03-05 04:04:38', 68, 0, NULL),
(7, 7, '1768814824881-833993133.mp4', 'video/mp4', 6397436, '1768814824881-833993133.mp4', 'local', NULL, 1, '2026-01-19 09:55:21', NULL, 0, 0, NULL),
(8, 11, '1768814824881-833993133.mp4', 'video/mp4', 6397436, '1768814824881-833993133.mp4', 'local', NULL, 1, '2026-01-19 09:55:21', NULL, 0, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `file_metadata`
--

CREATE TABLE `file_metadata` (
  `file_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `part_id` int(11) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `storage_url` varchar(500) NOT NULL,
  `storage_path` varchar(500) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `access_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `file_metadata`
--

INSERT INTO `file_metadata` (`file_id`, `user_id`, `module_id`, `unit_id`, `part_id`, `file_name`, `file_type`, `file_size`, `storage_url`, `storage_path`, `is_public`, `access_count`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 1, NULL, 'computer_basics.pdf', 'pdf', 2048576, 'https://company-server.com/files/computer_basics.pdf', '/ict/grade6/module1/unit1/', 0, 0, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(2, 2, 1, 1, NULL, 'hardware_components.pptx', 'pptx', 5242880, 'https://company-server.com/files/hardware_components.pptx', '/ict/grade6/module1/unit1/', 0, 0, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(3, 2, 1, 1, NULL, 'how_computers_work.mp4', 'mp4', 15728640, 'https://company-server.com/files/how_computers_work.mp4', '/ict/grade6/module1/unit1/', 0, 0, '2026-01-06 06:01:56', '2026-01-06 06:01:56');

-- --------------------------------------------------------

--
-- Table structure for table `learning_parts`
--

CREATE TABLE `learning_parts` (
  `part_id` int(11) NOT NULL,
  `unit_id` int(11) NOT NULL,
  `part_type` enum('reading','presentation','video','assignment') NOT NULL,
  `title` varchar(200) NOT NULL,
  `content_url` varchar(500) DEFAULT NULL,
  `content_type` varchar(50) DEFAULT NULL,
  `is_downloadable` tinyint(1) DEFAULT 1,
  `preview_enabled` tinyint(1) DEFAULT 1,
  `pages_count` int(11) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `content_data` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `duration_minutes` int(11) DEFAULT 10,
  `video_duration` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `requires_completion` tinyint(1) DEFAULT 1,
  `unlock_next` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `learning_parts`
--

INSERT INTO `learning_parts` (`part_id`, `unit_id`, `part_type`, `title`, `content_url`, `content_type`, `is_downloadable`, `preview_enabled`, `pages_count`, `thumbnail_url`, `file_size`, `content_data`, `display_order`, `duration_minutes`, `video_duration`, `is_active`, `requires_completion`, `unlock_next`, `created_at`, `updated_at`) VALUES
(4, 1, 'assignment', ' Quiz: Computer Basics', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, 4, 30, NULL, 1, 1, 0, '2026-01-06 06:01:56', '2026-01-20 04:25:45'),
(5, 2, 'reading', 'Getting Started with MS Word', 'uploads/1768809022940-793788968.pdf', NULL, 1, 1, NULL, NULL, NULL, '{\"originalName\":\"Mini project proposal presentation - 19APP3898 (2).pdf\",\"mimetype\":\"application/pdf\",\"size\":647730}', 1, 15, NULL, 1, 1, 1, '2026-01-06 06:01:56', '2026-01-19 07:50:22'),
(6, 2, 'presentation', 'Formatting Documents', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, 2, 20, NULL, 1, 1, 1, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(7, 2, 'video', 'Creating Tables in Word', 'uploads/1768814824881-833993133.mp4', 'video/mp4', 1, 1, NULL, NULL, 6, '{\"originalName\":\"Cademic_system_for_202601131436_0dumk.mp4\",\"mimetype\":\"video/mp4\",\"size\":2787324}', 3, 15, NULL, 1, 1, 1, '2026-01-06 06:01:56', '2026-01-19 09:49:57'),
(8, 2, 'assignment', 'MS', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, 4, 45, NULL, 1, 1, 0, '2026-01-06 06:01:56', '2026-01-20 04:29:05'),
(9, 3, 'reading', 'Understanding Online Risks', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, 1, 15, NULL, 1, 1, 1, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(10, 3, 'presentation', 'Creating Strong Passwords', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, 2, 15, NULL, 1, 1, 1, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(11, 3, 'video', 'Social Media Safety Tips', 'uploads/1768814824881-833993133.mp4', 'video/mp4', 1, 1, NULL, NULL, 6, NULL, 3, 10, NULL, 1, 1, 1, '2026-01-06 06:01:56', '2026-01-19 09:55:21'),
(12, 3, 'assignment', 'Quiz: Internet Safety Rules', NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, 4, 25, NULL, 1, 1, 0, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(13, 1, 'reading', 'Introduction to Computers', 'uploads/1772604509416-121260607.pdf', 'application/pdf', 1, 1, NULL, NULL, NULL, '{\"originalName\":\"Grade 10 TG and Syllabus English medium.pdf\",\"mimetype\":\"application/pdf\",\"size\":609697}', 1, 10, NULL, 1, 1, 1, '2026-01-06 06:20:07', '2026-03-04 06:08:29'),
(14, 1, 'video', 'How Computers Work', 'uploads/1772604517376-66562427.mp4', 'video/mp4', 1, 1, NULL, NULL, 6, '{\"originalName\":\"School_students_can_202601131440_a6xpf.mp4\",\"mimetype\":\"video/mp4\",\"size\":3907900}', 2, 10, NULL, 1, 1, 1, '2026-01-06 06:20:07', '2026-03-04 06:08:37'),
(15, 1, 'presentation', 'Computer Components', 'uploads/1772604541458-566386774.pdf', 'application/vnd.openxmlformats-officedocument.pres', 1, 1, NULL, NULL, NULL, '{\"originalName\":\"academic_system.pdf\",\"mimetype\":\"application/pdf\",\"size\":143200}', 3, 10, NULL, 1, 1, 1, '2026-01-06 06:20:07', '2026-03-04 06:09:01');

-- --------------------------------------------------------

--
-- Table structure for table `modules`
--

CREATE TABLE `modules` (
  `module_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `grade_level` varchar(20) DEFAULT NULL,
  `subject` varchar(50) DEFAULT 'ICT',
  `is_published` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `modules`
--

INSERT INTO `modules` (`module_id`, `school_id`, `module_name`, `description`, `grade_level`, `subject`, `is_published`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, 'ICT Basics for Grade 6', 'Introduction to computers and basic software', 'Grade 6', 'ICT', 1, 2, '2026-01-06 06:01:56', '2026-01-21 03:05:04');

-- --------------------------------------------------------

--
-- Table structure for table `module_learning_patterns`
--

CREATE TABLE `module_learning_patterns` (
  `pattern_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `preferred_learning_time` varchar(50) DEFAULT NULL,
  `avg_session_minutes` int(11) DEFAULT NULL,
  `preferred_content_type` enum('reading','video','presentation','interactive') DEFAULT NULL,
  `completion_pattern` enum('linear','random','focused','scattered') DEFAULT NULL,
  `retention_rate` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `performance_history`
-- (See below for the actual view)
--
CREATE TABLE `performance_history` (
`student_id` int(11)
,`date` date
,`completed_parts` bigint(21)
,`avg_score` int(1)
,`total_time_spent_minutes` decimal(36,4)
);

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `question_id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `question_type` enum('single','multiple') DEFAULT 'single',
  `option_a` varchar(500) NOT NULL,
  `option_b` varchar(500) NOT NULL,
  `option_c` varchar(500) DEFAULT NULL,
  `option_d` varchar(500) DEFAULT NULL,
  `option_e` varchar(500) DEFAULT NULL,
  `correct_answers` varchar(10) NOT NULL,
  `marks` int(11) DEFAULT 1,
  `explanation` text DEFAULT NULL,
  `difficulty_level` enum('easy','medium','hard') DEFAULT 'medium',
  `question_order` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`question_id`, `assignment_id`, `question_text`, `question_type`, `option_a`, `option_b`, `option_c`, `option_d`, `option_e`, `correct_answers`, `marks`, `explanation`, `difficulty_level`, `question_order`, `is_active`) VALUES
(12, 12, 'asdas', 'single', 'asd', 'asd', 'asd', 'asd', 'asd', 'B', 5, 'asdsa', 'medium', 1, 1),
(13, 1, 'asd', 'single', 'asd', 'asd', 'asd', 'asd', 'asd', 'B', 5, 'dasd', 'medium', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `report_type` varchar(50) NOT NULL,
  `report_name` varchar(255) NOT NULL,
  `generated_by` int(11) NOT NULL,
  `parameters_json` text DEFAULT NULL,
  `file_path` varchar(512) NOT NULL,
  `file_size_bytes` bigint(20) NOT NULL,
  `download_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`report_id`, `school_id`, `report_type`, `report_name`, `generated_by`, `parameters_json`, `file_path`, `file_size_bytes`, `download_count`, `created_at`, `expires_at`) VALUES
(1, 1, 'student_performance', 'student performance report', 7, '{\"startDate\":\"2026-01-07\",\"endDate\":\"2026-01-08\",\"classGrade\":\"Grade 6\",\"moduleId\":1,\"days\":30}', 'C:\\Users\\umindu\\Desktop\\academic-management-system-b25e6b2dcce69dd8af9d3d65672051d127c5e8f6 - Copy - Copy\\backend\\reports\\student_performance_1767863900865.xlsx', 7279, 0, '2026-01-08 09:18:20', NULL),
(2, 1, 'student_performance', 'student performance report', 7, '{\"startDate\":\"2026-01-07\",\"endDate\":\"2026-01-08\",\"classGrade\":\"grade 6\",\"moduleId\":1,\"days\":30}', 'C:\\Users\\umindu\\Desktop\\academic-management-system-b25e6b2dcce69dd8af9d3d65672051d127c5e8f6 - Copy - Copy\\backend\\reports\\student_performance_1767864173767.xlsx', 7280, 1, '2026-01-08 09:22:53', NULL),
(3, 1, 'class_summary', 'class summary report', 7, '{\"startDate\":\"2026-01-07\",\"endDate\":\"2026-01-08\",\"classGrade\":\"\",\"days\":30}', 'C:\\Users\\umindu\\Desktop\\academic-management-system-b25e6b2dcce69dd8af9d3d65672051d127c5e8f6 - Copy - Copy\\backend\\reports\\class_summary_1767864265490.xlsx', 6883, 1, '2026-01-08 09:24:25', NULL),
(4, 1, 'system_usage', 'system usage report', 7, '{\"startDate\":\"\",\"endDate\":\"\",\"classGrade\":\"\",\"days\":30}', 'C:\\Users\\umindu\\Desktop\\academic-management-system-b25e6b2dcce69dd8af9d3d65672051d127c5e8f6 - Copy - Copy\\backend\\reports\\system_usage_1767864284234.xlsx', 7372, 3, '2026-01-08 09:24:44', NULL),
(5, 1, 'student_performance', 'student performance report', 7, '{\"startDate\":\"\",\"endDate\":\"\",\"classGrade\":\"\",\"days\":30}', 'C:\\Users\\umindu\\Desktop\\academic-management-system-b25e6b2dcce69dd8af9d3d65672051d127c5e8f6 - Copy - Copy\\backend\\reports\\student_performance_1768275811579.xlsx', 7387, 1, '2026-01-13 03:43:31', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `report_items`
--

CREATE TABLE `report_items` (
  `item_id` int(11) NOT NULL,
  `report_type` varchar(50) NOT NULL,
  `column_name` varchar(100) NOT NULL,
  `column_label` varchar(100) NOT NULL,
  `data_type` enum('string','number','date','percentage','boolean') DEFAULT 'string',
  `sort_order` int(11) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `formula` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `report_items`
--

INSERT INTO `report_items` (`item_id`, `report_type`, `column_name`, `column_label`, `data_type`, `sort_order`, `is_visible`, `formula`, `created_at`) VALUES
(1, 'student_performance', 'student_name', 'Student Name', 'string', 1, 1, NULL, '2026-01-08 08:37:31'),
(2, 'student_performance', 'username', 'Username', 'string', 2, 1, NULL, '2026-01-08 08:37:31'),
(3, 'student_performance', 'class_grade', 'Grade/Class', 'string', 3, 1, NULL, '2026-01-08 08:37:31'),
(4, 'student_performance', 'module_name', 'Module', 'string', 4, 1, NULL, '2026-01-08 08:37:31'),
(5, 'student_performance', 'average_score', 'Avg Score', 'number', 5, 1, NULL, '2026-01-08 08:37:31'),
(6, 'student_performance', 'assignments_completed', 'Assignments Done', 'number', 6, 1, NULL, '2026-01-08 08:37:31'),
(7, 'class_summary', 'class_grade', 'Class', 'string', 1, 1, NULL, '2026-01-08 08:37:31'),
(8, 'class_summary', 'total_students', 'Total Students', 'number', 2, 1, NULL, '2026-01-08 08:37:31'),
(9, 'class_summary', 'active_students', 'Active Students', 'number', 3, 1, NULL, '2026-01-08 08:37:31'),
(10, 'class_summary', 'avg_score', 'Avg Score', 'number', 4, 1, NULL, '2026-01-08 08:37:31'),
(11, 'class_summary', 'avg_completion_rate', 'Avg Completion %', 'percentage', 5, 1, NULL, '2026-01-08 08:37:31'),
(12, 'module_analytics', 'module_name', 'Module Name', 'string', 1, 1, NULL, '2026-01-08 08:37:31'),
(13, 'module_analytics', 'grade_level', 'Grade Level', 'string', 2, 1, NULL, '2026-01-08 08:37:31'),
(14, 'module_analytics', 'total_students_started', 'Students Started', 'number', 3, 1, NULL, '2026-01-08 08:37:31'),
(15, 'module_analytics', 'completions', 'Completions', 'number', 4, 1, NULL, '2026-01-08 08:37:31'),
(16, 'module_analytics', 'avg_score', 'Avg Score', 'number', 5, 1, NULL, '2026-01-08 08:37:31');

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `school_id` int(11) NOT NULL,
  `school_name` varchar(100) NOT NULL,
  `school_code` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`school_id`, `school_name`, `school_code`, `address`, `contact_phone`, `created_at`) VALUES
(1, 'ABC International School', 'ABC001', '123 Main Street, Colombo', '0112345678', '2026-01-06 06:01:56');

-- --------------------------------------------------------

--
-- Table structure for table `student_analytics_summary`
--

CREATE TABLE `student_analytics_summary` (
  `summary_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `week_start_date` date NOT NULL,
  `completed_parts` int(11) DEFAULT 0,
  `total_parts` int(11) DEFAULT 0,
  `avg_score` decimal(5,2) DEFAULT NULL,
  `total_study_minutes` int(11) DEFAULT 0,
  `avg_daily_study_minutes` decimal(5,2) DEFAULT NULL,
  `days_active` int(11) DEFAULT 0,
  `weak_areas_json` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `student_analytics_view`
-- (See below for the actual view)
--
CREATE TABLE `student_analytics_view` (
`student_id` int(11)
,`full_name` varchar(100)
,`class_grade` varchar(20)
,`roll_number` varchar(20)
,`module_id` int(11)
,`module_name` varchar(100)
,`grade_level` varchar(20)
,`week_start_date` date
,`completed_parts` int(11)
,`total_parts` int(11)
,`avg_score` decimal(5,2)
,`total_study_minutes` int(11)
,`avg_daily_study_minutes` decimal(5,2)
,`days_active` int(11)
,`weak_areas` mediumtext
,`completion_percentage` decimal(16,2)
,`performance_category` varchar(17)
);

-- --------------------------------------------------------

--
-- Table structure for table `student_bookmarks`
--
-- Error reading structure for table academic_system.student_bookmarks: #1932 - Table 'academic_system.student_bookmarks' doesn't exist in engine
-- Error reading data for table academic_system.student_bookmarks: #1064 - You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near 'FROM `academic_system`.`student_bookmarks`' at line 1

-- --------------------------------------------------------

--
-- Stand-in structure for view `student_dashboard_view`
-- (See below for the actual view)
--
CREATE TABLE `student_dashboard_view` (
`user_id` int(11)
,`username` varchar(50)
,`full_name` varchar(100)
,`class_grade` varchar(20)
,`enrolled_modules` bigint(21)
,`total_parts` bigint(21)
,`completed_parts` decimal(22,0)
,`progress_percentage` decimal(28,2)
,`total_time` time
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `student_detailed_progress_view`
-- (See below for the actual view)
--
CREATE TABLE `student_detailed_progress_view` (
`student_id` int(11)
,`part_id` int(11)
,`content_title` varchar(200)
,`part_type` enum('reading','presentation','video','assignment')
,`unit_name` varchar(100)
,`module_name` varchar(100)
,`status` enum('not_started','in_progress','completed')
,`score` int(11)
,`started_at` timestamp
,`completed_at` timestamp
,`time_spent_seconds` int(11)
,`duration_minutes` bigint(21)
,`days_to_complete` int(7)
,`score_category` varchar(17)
);

-- --------------------------------------------------------

--
-- Table structure for table `student_progress`
--

CREATE TABLE `student_progress` (
  `progress_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `part_id` int(11) NOT NULL,
  `status` enum('not_started','in_progress','completed') DEFAULT 'not_started',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `last_accessed` timestamp NULL DEFAULT NULL,
  `time_spent_seconds` int(11) DEFAULT 0,
  `score` int(11) DEFAULT NULL,
  `total_marks` int(11) DEFAULT NULL,
  `attempts` int(11) DEFAULT 0,
  `data_json` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_progress`
--

INSERT INTO `student_progress` (`progress_id`, `student_id`, `part_id`, `status`, `started_at`, `completed_at`, `last_accessed`, `time_spent_seconds`, `score`, `total_marks`, `attempts`, `data_json`, `created_at`, `updated_at`) VALUES
(4, 2, 4, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(5, 2, 5, 'completed', '2026-01-01 06:01:56', '2026-01-02 06:01:56', NULL, 400, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(6, 2, 6, 'completed', '2026-01-02 06:01:56', '2026-01-03 06:01:56', NULL, 500, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(7, 2, 7, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(8, 2, 8, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(9, 2, 9, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(10, 2, 10, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(11, 2, 11, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(12, 2, 12, 'not_started', NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(14, 3, 9, 'in_progress', '2026-01-06 06:31:49', NULL, '2026-01-06 06:31:49', 0, NULL, NULL, 0, NULL, '2026-01-06 06:31:49', '2026-01-06 06:31:49'),
(15, 3, 5, 'in_progress', '2026-01-06 06:31:58', NULL, '2026-01-07 09:04:16', 0, NULL, NULL, 0, NULL, '2026-01-06 06:31:58', '2026-01-07 09:04:16'),
(16, 3, 8, 'in_progress', '2026-01-07 04:34:28', '2026-01-07 09:29:00', '2026-02-09 03:45:12', 0, NULL, NULL, 0, NULL, '2026-01-07 04:34:28', '2026-02-09 03:45:12'),
(17, 3, 12, 'in_progress', '2026-01-07 04:34:33', NULL, '2026-01-07 04:34:33', 0, NULL, NULL, 0, NULL, '2026-01-07 04:34:33', '2026-01-07 04:34:33'),
(18, 3, 14, 'completed', '2026-01-07 10:06:46', '2026-02-18 04:55:04', '2026-02-18 04:55:02', 700, NULL, NULL, 0, NULL, '2026-01-07 10:06:46', '2026-02-18 04:55:04'),
(19, 3, 15, 'completed', '2026-01-07 10:19:12', '2026-02-26 04:37:26', '2026-02-26 04:37:25', 50140, NULL, NULL, 0, NULL, '2026-01-07 10:19:12', '2026-02-26 04:37:26'),
(20, 3, 13, 'completed', '2026-01-08 03:07:40', '2026-02-09 03:44:46', '2026-02-09 03:44:45', 0, NULL, NULL, 0, NULL, '2026-01-08 03:07:40', '2026-02-09 03:44:46'),
(22, 3, 4, 'in_progress', '2026-01-08 03:08:09', '2026-02-09 03:45:42', '2026-02-26 04:39:44', 0, NULL, NULL, 0, NULL, '2026-01-08 03:08:09', '2026-02-26 04:39:44'),
(23, 15, 4, 'in_progress', '2026-01-19 06:36:08', '2026-03-05 03:57:31', '2026-03-09 03:51:18', 0, NULL, NULL, 0, NULL, '2026-01-19 06:36:08', '2026-03-09 03:51:18'),
(24, 8, 13, 'in_progress', '2026-01-20 04:08:47', NULL, '2026-01-20 04:24:11', 0, NULL, NULL, 0, NULL, '2026-01-20 04:08:47', '2026-01-20 04:24:11'),
(29, 15, 13, 'completed', '2026-03-04 06:01:31', '2026-03-05 04:04:34', '2026-03-05 04:04:07', 360, NULL, NULL, 0, NULL, '2026-03-04 06:01:31', '2026-03-05 04:04:34'),
(30, 15, 14, 'completed', '2026-03-04 06:10:24', '2026-03-05 04:04:41', '2026-03-05 04:04:38', 74, NULL, NULL, 0, NULL, '2026-03-04 06:10:24', '2026-03-05 04:04:41'),
(31, 15, 15, 'in_progress', '2026-03-04 06:12:57', '2026-03-05 04:05:34', '2026-03-09 03:48:16', 1630, NULL, NULL, 0, NULL, '2026-03-04 06:12:57', '2026-03-09 03:48:16');

-- --------------------------------------------------------

--
-- Table structure for table `student_time_tracking`
--

CREATE TABLE `student_time_tracking` (
  `tracking_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `learning_part_id` int(11) NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NULL DEFAULT NULL,
  `duration_seconds` int(11) DEFAULT NULL,
  `session_type` enum('learning','review','assignment','assessment') DEFAULT 'learning',
  `focus_score` int(11) DEFAULT 3,
  `distractions_noted` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_weak_areas`
--

CREATE TABLE `student_weak_areas` (
  `weak_area_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `unit_id` int(11) DEFAULT NULL,
  `learning_part_id` int(11) DEFAULT NULL,
  `area_type` enum('concept','skill','assignment_type','time_management') NOT NULL,
  `area_name` varchar(200) NOT NULL,
  `difficulty_score` int(11) DEFAULT 1,
  `occurrences` int(11) DEFAULT 1,
  `first_identified` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_occurrence` timestamp NOT NULL DEFAULT current_timestamp(),
  `improvement_status` enum('identified','improving','resolved') DEFAULT 'identified',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `submission_id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `attempt_number` int(11) NOT NULL,
  `answers_json` text NOT NULL,
  `score` int(11) DEFAULT 0,
  `total_marks` int(11) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  `time_taken_seconds` int(11) DEFAULT NULL,
  `started_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `submitted_at` timestamp NULL DEFAULT NULL,
  `status` enum('in_progress','submitted','timed_out','abandoned') DEFAULT 'in_progress',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `review_data` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`submission_id`, `assignment_id`, `student_id`, `attempt_number`, `answers_json`, `score`, `total_marks`, `percentage`, `time_taken_seconds`, `started_at`, `submitted_at`, `status`, `ip_address`, `user_agent`, `review_data`) VALUES
(82, 1, 15, 1, '{}', 0, 5, 0.00, 0, '2026-03-05 03:58:44', '2026-03-05 03:58:44', 'submitted', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '[{\"question_id\":13,\"correct_answers\":[\"B\"],\"marks_obtained\":0,\"total_marks\":5,\"explanation\":\"dasd\"}]');

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `log_id` int(11) NOT NULL,
  `log_level` enum('debug','info','warn','error','fatal') DEFAULT 'info',
  `module` varchar(50) DEFAULT NULL,
  `message` text NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `created_at`, `updated_at`) VALUES
('academic_year', '2025-2026', 'Current academic year', '2026-01-09 09:47:45', '2026-01-21 09:36:50'),
('allow_registration', 'true', 'Allow new user registrations', '2026-01-09 09:47:45', '2026-01-21 09:36:50'),
('current_term', 'Term 1', 'Current active term', '2026-01-09 09:47:45', '2026-01-21 09:36:50'),
('email_notifications', 'true', 'Enable email notifications', '2026-01-09 09:47:45', '2026-01-21 09:36:50'),
('maintenance_mode', 'false', 'System maintenance mode status', '2026-01-09 09:47:45', '2026-01-21 09:36:50'),
('school_name', 'Future Academy', 'Name of the school', '2026-01-09 09:47:45', '2026-01-21 09:36:50');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_classes`
--

CREATE TABLE `teacher_classes` (
  `assignment_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `class_section` varchar(50) DEFAULT NULL,
  `assigned_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teacher_classes`
--

INSERT INTO `teacher_classes` (`assignment_id`, `teacher_id`, `module_id`, `class_section`, `assigned_date`, `is_active`) VALUES
(1, 2, 1, 'Section A', '2026-01-08 04:50:23', 1),
(2, 2, 1, 'Section B', '2026-01-08 04:50:23', 1),
(5, 7, 1, 'A', '2026-01-08 05:05:42', 1);

-- --------------------------------------------------------

--
-- Stand-in structure for view `teacher_dashboard_view`
-- (See below for the actual view)
--
CREATE TABLE `teacher_dashboard_view` (
`assignment_id` int(11)
,`teacher_id` int(11)
,`module_id` int(11)
,`class_section` varchar(50)
,`module_name` varchar(100)
,`grade_level` varchar(20)
,`subject` varchar(50)
,`total_students` bigint(21)
,`active_students` bigint(21)
,`avg_class_score` decimal(14,4)
,`last_activity` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `teacher_students_view`
-- (See below for the actual view)
--
CREATE TABLE `teacher_students_view` (
`assignment_id` int(11)
,`teacher_id` int(11)
,`module_id` int(11)
,`class_section` varchar(50)
,`student_id` int(11)
,`full_name` varchar(100)
,`username` varchar(50)
,`roll_number` varchar(20)
,`class_grade` varchar(20)
,`section` varchar(10)
,`total_parts` bigint(21)
,`completed_parts` bigint(21)
,`avg_score` decimal(14,4)
,`total_study_time_minutes` decimal(36,4)
,`last_activity_date` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `unit_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `unit_name` varchar(100) NOT NULL,
  `unit_order` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `learning_objectives` text DEFAULT NULL,
  `estimated_time_minutes` int(11) DEFAULT 30,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`unit_id`, `module_id`, `unit_name`, `unit_order`, `description`, `learning_objectives`, `estimated_time_minutes`, `created_at`, `updated_at`) VALUES
(1, 1, 'Introduction to Computers', 1, 'Learn the basics of computer hardware and software', '• Identify computer components\n• Understand hardware vs software\n• Learn about operating systems', 45, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(2, 1, 'Using MS Word', 2, 'Create and format documents in Microsoft Word', '• Create new documents\n• Format text and paragraphs\n• Add images and tables', 60, '2026-01-06 06:01:56', '2026-01-06 06:01:56'),
(3, 1, 'Internet Safety', 3, 'Learn how to stay safe online', '• Identify online risks\n• Create strong passwords\n• Understand privacy settings', 50, '2026-01-06 06:01:56', '2026-01-06 06:01:56');

-- --------------------------------------------------------

--
-- Stand-in structure for view `upcoming_assignments_view`
-- (See below for the actual view)
--
CREATE TABLE `upcoming_assignments_view` (
`assignment_id` int(11)
,`title` varchar(200)
,`description` text
,`total_marks` int(11)
,`passing_marks` int(11)
,`max_attempts` int(11)
,`start_date` timestamp
,`end_date` timestamp
,`is_active` tinyint(1)
,`module_name` varchar(100)
,`module_id` int(11)
,`user_id` int(11)
,`attempts_used` bigint(21)
,`status` varchar(18)
);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('student','teacher','admin') NOT NULL,
  `class_grade` varchar(20) DEFAULT NULL,
  `section` varchar(10) DEFAULT NULL,
  `roll_number` varchar(20) DEFAULT NULL,
  `subject` varchar(50) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `login_attempts` int(11) DEFAULT 0,
  `account_locked_until` timestamp NULL DEFAULT NULL,
  `profile_picture_url` varchar(500) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `parent_contact` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `must_change_password` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `school_id`, `username`, `full_name`, `role`, `class_grade`, `section`, `roll_number`, `subject`, `password_hash`, `is_active`, `last_login`, `password_reset_token`, `password_reset_expires`, `login_attempts`, `account_locked_until`, `profile_picture_url`, `date_of_birth`, `parent_contact`, `created_at`, `updated_at`, `must_change_password`) VALUES
(1, 1, 'admin001', 'Principal Silva', 'admin', NULL, NULL, NULL, NULL, '$2a$10$SimplePassForKids1234567890AB', 1, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-06 06:01:56', '2026-01-19 06:12:29', 0),
(2, 1, 'teacher_ict01', 'Ms. Perera', 'teacher', NULL, NULL, NULL, 'ICT', '$2a$10$SimplePassForKids1234567890AB', 1, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-06 06:01:56', '2026-01-06 06:01:56', 0),
(3, 1, 'test_student', 'Test Student', 'student', 'Grade 6', NULL, '6A001', NULL, '$2a$10$SmKBerL28wKqsaU69FpY/utQ54Bg639P97BCFjbSKtkCTWSJql8f.', 1, '2026-03-04 03:12:18', NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-06 06:01:56', '2026-03-04 03:12:18', 0),
(7, 1, 'test_teacher', 'Test Teacher', 'teacher', NULL, NULL, NULL, 'ICT', '$2a$10$LZQmXcwuTsC./OBLBJH2JenEbAMoWNHSVCdjT/c.2/NUL5MxxToji', 1, '2026-03-05 07:14:22', NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-06 06:01:56', '2026-03-05 07:14:22', 0),
(8, 1, 'test_admin', 'Test Admin', 'admin', NULL, NULL, NULL, NULL, '$2a$10$tHr08ulCn8jTMXe0EaOpz.HRE.97NLDQfYBrYhuKdMHSn/37TWpAW', 1, '2026-03-09 03:48:38', NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-06 06:01:56', '2026-03-09 03:48:38', 0),
(15, 1, 'umindu1', 'Umindu Kethaka Vittahachchi', 'student', 'Grade 6', NULL, '6A0015', '', '$2a$10$5HPtQ4YCBYF/q1ssNOf.H.YMcdhut2gzMSIq8a9u1/O39/mCFcJtO', 1, '2026-03-09 03:50:51', NULL, NULL, 0, NULL, NULL, NULL, NULL, '2026-01-19 06:14:01', '2026-03-09 03:50:51', 0);

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` text NOT NULL,
  `device_info` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL DEFAULT (current_timestamp() + interval 7 day),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure for view `assignment_performance_view`
--
DROP TABLE IF EXISTS `assignment_performance_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `assignment_performance_view`  AS SELECT `tc`.`assignment_id` AS `assignment_id`, `tc`.`teacher_id` AS `teacher_id`, `tc`.`module_id` AS `module_id`, `tc`.`class_section` AS `class_section`, `a`.`assignment_id` AS `assignment_ref_id`, `a`.`title` AS `assignment_title`, `a`.`total_marks` AS `total_marks`, count(distinct `ar`.`student_id`) AS `submissions_count`, avg(`ar`.`best_score`) AS `avg_score`, sum(case when `ar`.`passed` then 1 else 0 end) AS `passed_count` FROM (((((`teacher_classes` `tc` join `modules` `m` on(`tc`.`module_id` = `m`.`module_id`)) join `units` `un` on(`m`.`module_id` = `un`.`module_id`)) join `learning_parts` `lp` on(`un`.`unit_id` = `lp`.`unit_id`)) join `assignments` `a` on(`lp`.`part_id` = `a`.`part_id`)) left join `assignment_results` `ar` on(`a`.`assignment_id` = `ar`.`assignment_id`)) GROUP BY `tc`.`assignment_id`, `a`.`assignment_id` ;

-- --------------------------------------------------------

--
-- Structure for view `class_performance_view`
--
DROP TABLE IF EXISTS `class_performance_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `class_performance_view`  AS SELECT `tc`.`assignment_id` AS `assignment_id`, `tc`.`teacher_id` AS `teacher_id`, `tc`.`module_id` AS `module_id`, `tc`.`class_section` AS `class_section`, cast(`sp`.`completed_at` as date) AS `activity_date`, count(distinct `sp`.`student_id`) AS `active_students`, count(distinct `sp`.`part_id`) AS `completed_items`, avg(`sp`.`score`) AS `avg_score` FROM (((((`teacher_classes` `tc` join `modules` `m` on(`tc`.`module_id` = `m`.`module_id`)) join `units` `un` on(`m`.`module_id` = `un`.`module_id`)) join `learning_parts` `lp` on(`un`.`unit_id` = `lp`.`unit_id`)) join `student_progress` `sp` on(`lp`.`part_id` = `sp`.`part_id`)) join `users` `u` on(`sp`.`student_id` = `u`.`user_id` and (`u`.`class_grade` = `m`.`grade_level` or `m`.`grade_level` is null or `u`.`class_grade` is null))) WHERE `sp`.`status` = 'completed' GROUP BY `tc`.`assignment_id`, cast(`sp`.`completed_at` as date) ;

-- --------------------------------------------------------

--
-- Structure for view `performance_history`
--
DROP TABLE IF EXISTS `performance_history`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `performance_history`  AS SELECT `student_progress`.`student_id` AS `student_id`, cast(`student_progress`.`completed_at` as date) AS `date`, count(0) AS `completed_parts`, 0 AS `avg_score`, sum(`student_progress`.`time_spent_seconds`) / 60 AS `total_time_spent_minutes` FROM `student_progress` WHERE `student_progress`.`status` = 'completed' AND `student_progress`.`completed_at` is not null GROUP BY `student_progress`.`student_id`, cast(`student_progress`.`completed_at` as date) ;

-- --------------------------------------------------------

--
-- Structure for view `student_analytics_view`
--
DROP TABLE IF EXISTS `student_analytics_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `student_analytics_view`  AS SELECT `sa`.`student_id` AS `student_id`, `u`.`full_name` AS `full_name`, `u`.`class_grade` AS `class_grade`, `u`.`roll_number` AS `roll_number`, `m`.`module_id` AS `module_id`, `m`.`module_name` AS `module_name`, `m`.`grade_level` AS `grade_level`, `sa`.`week_start_date` AS `week_start_date`, `sa`.`completed_parts` AS `completed_parts`, `sa`.`total_parts` AS `total_parts`, `sa`.`avg_score` AS `avg_score`, `sa`.`total_study_minutes` AS `total_study_minutes`, `sa`.`avg_daily_study_minutes` AS `avg_daily_study_minutes`, `sa`.`days_active` AS `days_active`, json_extract(`sa`.`weak_areas_json`,'$') AS `weak_areas`, round(`sa`.`completed_parts` * 100.0 / nullif(`sa`.`total_parts`,0),2) AS `completion_percentage`, CASE WHEN `sa`.`avg_score` >= 80 THEN 'excellent' WHEN `sa`.`avg_score` >= 60 THEN 'good' WHEN `sa`.`avg_score` >= 40 THEN 'average' ELSE 'needs_improvement' END AS `performance_category` FROM ((`student_analytics_summary` `sa` join `users` `u` on(`sa`.`student_id` = `u`.`user_id`)) join `modules` `m` on(`sa`.`module_id` = `m`.`module_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `student_dashboard_view`
--
DROP TABLE IF EXISTS `student_dashboard_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `student_dashboard_view`  AS SELECT `u`.`user_id` AS `user_id`, `u`.`username` AS `username`, `u`.`full_name` AS `full_name`, `u`.`class_grade` AS `class_grade`, count(distinct `m`.`module_id`) AS `enrolled_modules`, count(distinct `lp`.`part_id`) AS `total_parts`, sum(case when `sp`.`status` = 'completed' then 1 else 0 end) AS `completed_parts`, round(sum(case when `sp`.`status` = 'completed' then 1 else 0 end) / count(distinct `lp`.`part_id`) * 100,2) AS `progress_percentage`, sec_to_time(sum(`sp`.`time_spent_seconds`)) AS `total_time` FROM ((((`users` `u` left join `modules` `m` on(`u`.`school_id` = `m`.`school_id` and `m`.`is_published` = 1)) left join `units` `ut` on(`m`.`module_id` = `ut`.`module_id`)) left join `learning_parts` `lp` on(`ut`.`unit_id` = `lp`.`unit_id` and `lp`.`is_active` = 1)) left join `student_progress` `sp` on(`lp`.`part_id` = `sp`.`part_id` and `sp`.`student_id` = `u`.`user_id`)) WHERE `u`.`role` = 'student' GROUP BY `u`.`user_id` ;

-- --------------------------------------------------------

--
-- Structure for view `student_detailed_progress_view`
--
DROP TABLE IF EXISTS `student_detailed_progress_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `student_detailed_progress_view`  AS SELECT `sp`.`student_id` AS `student_id`, `lp`.`part_id` AS `part_id`, `lp`.`title` AS `content_title`, `lp`.`part_type` AS `part_type`, `u`.`unit_name` AS `unit_name`, `m`.`module_name` AS `module_name`, `sp`.`status` AS `status`, `sp`.`score` AS `score`, `sp`.`started_at` AS `started_at`, `sp`.`completed_at` AS `completed_at`, `sp`.`time_spent_seconds` AS `time_spent_seconds`, timestampdiff(MINUTE,`sp`.`started_at`,`sp`.`completed_at`) AS `duration_minutes`, to_days(`sp`.`completed_at`) - to_days(`sp`.`started_at`) AS `days_to_complete`, CASE WHEN `sp`.`score` >= 80 THEN 'excellent' WHEN `sp`.`score` >= 60 THEN 'good' WHEN `sp`.`score` >= 40 THEN 'average' ELSE 'needs_improvement' END AS `score_category` FROM (((`student_progress` `sp` join `learning_parts` `lp` on(`sp`.`part_id` = `lp`.`part_id`)) join `units` `u` on(`lp`.`unit_id` = `u`.`unit_id`)) join `modules` `m` on(`u`.`module_id` = `m`.`module_id`)) WHERE `sp`.`status` = 'completed' ;

-- --------------------------------------------------------

--
-- Structure for view `teacher_dashboard_view`
--
DROP TABLE IF EXISTS `teacher_dashboard_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `teacher_dashboard_view`  AS SELECT `tc`.`assignment_id` AS `assignment_id`, `tc`.`teacher_id` AS `teacher_id`, `tc`.`module_id` AS `module_id`, `tc`.`class_section` AS `class_section`, `m`.`module_name` AS `module_name`, `m`.`grade_level` AS `grade_level`, `m`.`subject` AS `subject`, count(distinct `u`.`user_id`) AS `total_students`, count(distinct case when `sp`.`status` = 'completed' then `sp`.`student_id` end) AS `active_students`, avg(case when `sp`.`status` = 'completed' then `sp`.`score` else NULL end) AS `avg_class_score`, max(`sp`.`completed_at`) AS `last_activity` FROM (((`teacher_classes` `tc` join `modules` `m` on(`tc`.`module_id` = `m`.`module_id`)) join `users` `u` on(`m`.`school_id` = `u`.`school_id` and `u`.`role` = 'student')) left join `student_progress` `sp` on(`u`.`user_id` = `sp`.`student_id` and `sp`.`part_id` in (select `lp`.`part_id` from (`learning_parts` `lp` join `units` `un` on(`lp`.`unit_id` = `un`.`unit_id`)) where `un`.`module_id` = `m`.`module_id`))) WHERE `tc`.`is_active` = 1 AND `m`.`is_published` = 1 GROUP BY `tc`.`assignment_id`, `tc`.`teacher_id`, `tc`.`module_id`, `tc`.`class_section` ;

-- --------------------------------------------------------

--
-- Structure for view `teacher_students_view`
--
DROP TABLE IF EXISTS `teacher_students_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `teacher_students_view`  AS SELECT `tc`.`assignment_id` AS `assignment_id`, `tc`.`teacher_id` AS `teacher_id`, `tc`.`module_id` AS `module_id`, `tc`.`class_section` AS `class_section`, `u`.`user_id` AS `student_id`, `u`.`full_name` AS `full_name`, `u`.`username` AS `username`, `u`.`roll_number` AS `roll_number`, `u`.`class_grade` AS `class_grade`, `u`.`section` AS `section`, count(distinct `lp`.`part_id`) AS `total_parts`, count(distinct case when `sp`.`status` = 'completed' then `sp`.`part_id` end) AS `completed_parts`, avg(`sp`.`score`) AS `avg_score`, sum(`sp`.`time_spent_seconds`) / 60 AS `total_study_time_minutes`, max(`sp`.`completed_at`) AS `last_activity_date` FROM (((((`teacher_classes` `tc` join `modules` `m` on(`tc`.`module_id` = `m`.`module_id`)) join `users` `u` on(`u`.`school_id` = `m`.`school_id` and `u`.`role` = 'student' and (`u`.`class_grade` = `m`.`grade_level` or `m`.`grade_level` is null) and (`u`.`section` = `tc`.`class_section` or `tc`.`class_section` is null or `u`.`section` is null))) join `units` `un` on(`m`.`module_id` = `un`.`module_id`)) join `learning_parts` `lp` on(`un`.`unit_id` = `lp`.`unit_id`)) left join `student_progress` `sp` on(`lp`.`part_id` = `sp`.`part_id` and `sp`.`student_id` = `u`.`user_id`)) GROUP BY `tc`.`assignment_id`, `u`.`user_id` ;

-- --------------------------------------------------------

--
-- Structure for view `upcoming_assignments_view`
--
DROP TABLE IF EXISTS `upcoming_assignments_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `upcoming_assignments_view`  AS SELECT `a`.`assignment_id` AS `assignment_id`, `a`.`title` AS `title`, `a`.`description` AS `description`, `a`.`total_marks` AS `total_marks`, `a`.`passing_marks` AS `passing_marks`, `a`.`max_attempts` AS `max_attempts`, `a`.`start_date` AS `start_date`, `a`.`end_date` AS `end_date`, `a`.`is_active` AS `is_active`, `m`.`module_name` AS `module_name`, `m`.`module_id` AS `module_id`, `u`.`user_id` AS `user_id`, coalesce(`ar_aggr`.`attempts_used`,0) AS `attempts_used`, CASE WHEN `ar_aggr`.`passed` > 0 THEN 'completed' WHEN current_timestamp() > `a`.`end_date` THEN 'expired' WHEN coalesce(`ar_aggr`.`attempts_used`,0) >= `a`.`max_attempts` THEN 'attempts_exhausted' ELSE 'available' END AS `status` FROM (((((`users` `u` join `modules` `m` on(`u`.`school_id` = `m`.`school_id`)) join `units` `un` on(`m`.`module_id` = `un`.`module_id`)) join `learning_parts` `lp` on(`un`.`unit_id` = `lp`.`unit_id`)) join `assignments` `a` on(`lp`.`part_id` = `a`.`part_id`)) left join (select `assignment_results`.`assignment_id` AS `assignment_id`,`assignment_results`.`student_id` AS `student_id`,count(0) AS `attempts_used`,max(case when `assignment_results`.`passed` then 1 else 0 end) AS `passed` from `assignment_results` group by `assignment_results`.`assignment_id`,`assignment_results`.`student_id`) `ar_aggr` on(`a`.`assignment_id` = `ar_aggr`.`assignment_id` and `u`.`user_id` = `ar_aggr`.`student_id`)) WHERE `u`.`role` = 'student' AND `m`.`is_published` = 1 ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `idx_part_assignment` (`part_id`),
  ADD KEY `fk_assignments_created_by` (`created_by`),
  ADD KEY `idx_active_dates` (`is_active`,`start_date`,`end_date`);

--
-- Indexes for table `assignment_analysis`
--
ALTER TABLE `assignment_analysis`
  ADD PRIMARY KEY (`analysis_id`),
  ADD UNIQUE KEY `unique_submission_analysis` (`submission_id`),
  ADD KEY `assignment_id` (`assignment_id`),
  ADD KEY `idx_student_assignment` (`student_id`,`assignment_id`),
  ADD KEY `idx_accuracy` (`accuracy_percentage`);

--
-- Indexes for table `assignment_attempts`
--
ALTER TABLE `assignment_attempts`
  ADD PRIMARY KEY (`attempt_id`),
  ADD UNIQUE KEY `unique_active_attempt` (`assignment_id`,`student_id`,`attempt_number`,`status`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `idx_active_status` (`assignment_id`,`student_id`,`status`);

--
-- Indexes for table `assignment_results`
--
ALTER TABLE `assignment_results`
  ADD PRIMARY KEY (`result_id`),
  ADD UNIQUE KEY `unique_assignment_student` (`assignment_id`,`student_id`),
  ADD KEY `idx_student_results` (`student_id`,`passed`);

--
-- Indexes for table `auth_activity_logs`
--
ALTER TABLE `auth_activity_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_user_activity` (`user_id`,`created_at`),
  ADD KEY `idx_activity_type` (`activity_type`,`created_at`);

--
-- Indexes for table `content_access_logs`
--
ALTER TABLE `content_access_logs`
  ADD PRIMARY KEY (`access_id`),
  ADD KEY `part_id` (`part_id`),
  ADD KEY `idx_user_content` (`user_id`,`part_id`),
  ADD KEY `idx_access_time` (`accessed_at`);

--
-- Indexes for table `content_metadata`
--
ALTER TABLE `content_metadata`
  ADD PRIMARY KEY (`metadata_id`),
  ADD KEY `idx_part_id` (`part_id`),
  ADD KEY `idx_storage_path` (`storage_path`(255)),
  ADD KEY `idx_uploaded_by` (`uploaded_by`);

--
-- Indexes for table `file_metadata`
--
ALTER TABLE `file_metadata`
  ADD PRIMARY KEY (`file_id`),
  ADD KEY `unit_id` (`unit_id`),
  ADD KEY `part_id` (`part_id`),
  ADD KEY `idx_user_files` (`user_id`,`created_at`),
  ADD KEY `idx_module_files` (`module_id`,`file_type`);

--
-- Indexes for table `learning_parts`
--
ALTER TABLE `learning_parts`
  ADD PRIMARY KEY (`part_id`),
  ADD KEY `idx_unit_order` (`unit_id`,`display_order`),
  ADD KEY `idx_part_type` (`part_type`);

--
-- Indexes for table `modules`
--
ALTER TABLE `modules`
  ADD PRIMARY KEY (`module_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_school_grade` (`school_id`,`grade_level`),
  ADD KEY `idx_published` (`is_published`);

--
-- Indexes for table `module_learning_patterns`
--
ALTER TABLE `module_learning_patterns`
  ADD PRIMARY KEY (`pattern_id`),
  ADD UNIQUE KEY `unique_student_module_pattern` (`student_id`,`module_id`),
  ADD KEY `module_id` (`module_id`),
  ADD KEY `idx_learning_patterns` (`preferred_learning_time`,`preferred_content_type`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`question_id`),
  ADD KEY `idx_assignment_order` (`assignment_id`,`question_order`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `generated_by` (`generated_by`);

--
-- Indexes for table `report_items`
--
ALTER TABLE `report_items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`school_id`),
  ADD UNIQUE KEY `school_code` (`school_code`);

--
-- Indexes for table `student_analytics_summary`
--
ALTER TABLE `student_analytics_summary`
  ADD PRIMARY KEY (`summary_id`),
  ADD UNIQUE KEY `unique_student_module_week` (`student_id`,`module_id`,`week_start_date`),
  ADD KEY `idx_student_week` (`student_id`,`week_start_date`),
  ADD KEY `idx_module_week` (`module_id`,`week_start_date`);

--
-- Indexes for table `student_progress`
--
ALTER TABLE `student_progress`
  ADD PRIMARY KEY (`progress_id`),
  ADD UNIQUE KEY `unique_student_part` (`student_id`,`part_id`),
  ADD KEY `idx_student_status` (`student_id`,`status`),
  ADD KEY `idx_part_student` (`part_id`,`student_id`);

--
-- Indexes for table `student_time_tracking`
--
ALTER TABLE `student_time_tracking`
  ADD PRIMARY KEY (`tracking_id`),
  ADD KEY `learning_part_id` (`learning_part_id`),
  ADD KEY `idx_student_session` (`student_id`,`session_type`,`start_time`),
  ADD KEY `idx_time_range` (`start_time`,`end_time`);

--
-- Indexes for table `student_weak_areas`
--
ALTER TABLE `student_weak_areas`
  ADD PRIMARY KEY (`weak_area_id`),
  ADD KEY `unit_id` (`unit_id`),
  ADD KEY `learning_part_id` (`learning_part_id`),
  ADD KEY `idx_student_area` (`student_id`,`area_type`,`improvement_status`),
  ADD KEY `idx_module_difficulty` (`module_id`,`difficulty_score`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD UNIQUE KEY `unique_attempt` (`assignment_id`,`student_id`,`attempt_number`),
  ADD KEY `idx_student_assignment` (`student_id`,`assignment_id`),
  ADD KEY `idx_submitted_at` (`submitted_at`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_log_level` (`log_level`,`created_at`),
  ADD KEY `idx_module` (`module`,`created_at`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  ADD PRIMARY KEY (`assignment_id`),
  ADD UNIQUE KEY `unique_teacher_module` (`teacher_id`,`module_id`,`class_section`),
  ADD KEY `module_id` (`module_id`),
  ADD KEY `idx_teacher_active` (`teacher_id`,`is_active`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`unit_id`),
  ADD KEY `idx_module_order` (`module_id`,`unit_order`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_school_role` (`school_id`,`role`),
  ADD KEY `idx_class_grade` (`class_grade`,`school_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `idx_user_sessions` (`user_id`,`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `assignment_analysis`
--
ALTER TABLE `assignment_analysis`
  MODIFY `analysis_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_attempts`
--
ALTER TABLE `assignment_attempts`
  MODIFY `attempt_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `assignment_results`
--
ALTER TABLE `assignment_results`
  MODIFY `result_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `auth_activity_logs`
--
ALTER TABLE `auth_activity_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=609;

--
-- AUTO_INCREMENT for table `content_access_logs`
--
ALTER TABLE `content_access_logs`
  MODIFY `access_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1042;

--
-- AUTO_INCREMENT for table `content_metadata`
--
ALTER TABLE `content_metadata`
  MODIFY `metadata_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `file_metadata`
--
ALTER TABLE `file_metadata`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `learning_parts`
--
ALTER TABLE `learning_parts`
  MODIFY `part_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `modules`
--
ALTER TABLE `modules`
  MODIFY `module_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `module_learning_patterns`
--
ALTER TABLE `module_learning_patterns`
  MODIFY `pattern_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `report_items`
--
ALTER TABLE `report_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `school_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `student_analytics_summary`
--
ALTER TABLE `student_analytics_summary`
  MODIFY `summary_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_progress`
--
ALTER TABLE `student_progress`
  MODIFY `progress_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `student_time_tracking`
--
ALTER TABLE `student_time_tracking`
  MODIFY `tracking_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_weak_areas`
--
ALTER TABLE `student_weak_areas`
  MODIFY `weak_area_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `unit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `learning_parts` (`part_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `assignment_analysis`
--
ALTER TABLE `assignment_analysis`
  ADD CONSTRAINT `assignment_analysis_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `assignment_analysis_ibfk_2` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`assignment_id`),
  ADD CONSTRAINT `assignment_analysis_ibfk_3` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`);

--
-- Constraints for table `assignment_attempts`
--
ALTER TABLE `assignment_attempts`
  ADD CONSTRAINT `assignment_attempts_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`assignment_id`),
  ADD CONSTRAINT `assignment_attempts_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `assignment_results`
--
ALTER TABLE `assignment_results`
  ADD CONSTRAINT `assignment_results_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`assignment_id`),
  ADD CONSTRAINT `assignment_results_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `auth_activity_logs`
--
ALTER TABLE `auth_activity_logs`
  ADD CONSTRAINT `auth_activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `content_access_logs`
--
ALTER TABLE `content_access_logs`
  ADD CONSTRAINT `content_access_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `content_access_logs_ibfk_2` FOREIGN KEY (`part_id`) REFERENCES `learning_parts` (`part_id`);

--
-- Constraints for table `content_metadata`
--
ALTER TABLE `content_metadata`
  ADD CONSTRAINT `content_metadata_ibfk_1` FOREIGN KEY (`part_id`) REFERENCES `learning_parts` (`part_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `content_metadata_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `file_metadata`
--
ALTER TABLE `file_metadata`
  ADD CONSTRAINT `file_metadata_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `file_metadata_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `file_metadata_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `file_metadata_ibfk_4` FOREIGN KEY (`part_id`) REFERENCES `learning_parts` (`part_id`) ON DELETE SET NULL;

--
-- Constraints for table `learning_parts`
--
ALTER TABLE `learning_parts`
  ADD CONSTRAINT `learning_parts_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`) ON DELETE CASCADE;

--
-- Constraints for table `modules`
--
ALTER TABLE `modules`
  ADD CONSTRAINT `modules_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `modules_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `module_learning_patterns`
--
ALTER TABLE `module_learning_patterns`
  ADD CONSTRAINT `module_learning_patterns_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `module_learning_patterns_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`);

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`assignment_id`) ON DELETE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_analytics_summary`
--
ALTER TABLE `student_analytics_summary`
  ADD CONSTRAINT `student_analytics_summary_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `student_analytics_summary_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`);

--
-- Constraints for table `student_progress`
--
ALTER TABLE `student_progress`
  ADD CONSTRAINT `student_progress_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_progress_ibfk_2` FOREIGN KEY (`part_id`) REFERENCES `learning_parts` (`part_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_time_tracking`
--
ALTER TABLE `student_time_tracking`
  ADD CONSTRAINT `student_time_tracking_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `student_time_tracking_ibfk_2` FOREIGN KEY (`learning_part_id`) REFERENCES `learning_parts` (`part_id`);

--
-- Constraints for table `student_weak_areas`
--
ALTER TABLE `student_weak_areas`
  ADD CONSTRAINT `student_weak_areas_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `student_weak_areas_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`),
  ADD CONSTRAINT `student_weak_areas_ibfk_3` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`),
  ADD CONSTRAINT `student_weak_areas_ibfk_4` FOREIGN KEY (`learning_part_id`) REFERENCES `learning_parts` (`part_id`);

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`assignment_id`),
  ADD CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `teacher_classes`
--
ALTER TABLE `teacher_classes`
  ADD CONSTRAINT `teacher_classes_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `teacher_classes_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`);

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `units_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`school_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
