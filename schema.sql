-- Smart India Hackathon (SIH) 2026 — University of Kalyani
-- Database Schema for Neon DB (PostgreSQL)

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) UNIQUE NOT NULL,
    problem_id VARCHAR(50),
    problem_statement TEXT,
    edition VARCHAR(20) CHECK (edition IN ('Software', 'Hardware')) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(15),
    roll_number VARCHAR(50) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester INTEGER CHECK (semester BETWEEN 1 AND 8) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')) NOT NULL,
    is_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(team_name);
