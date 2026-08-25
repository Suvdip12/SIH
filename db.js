// db.js — Neon DB Connection & Query Layer
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

// ─── Initialize Tables ───
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      team_name VARCHAR(100) UNIQUE NOT NULL,
      problem_id VARCHAR(50),
      problem_statement TEXT,
      edition VARCHAR(20) CHECK (edition IN ('Software', 'Hardware')) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
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
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(team_name)`;

  console.log('✅ Database tables initialized');
}

// ─── Create Team with Members (Transaction-like) ───
export async function createTeam(teamData, membersData) {
  // Insert team
  const [team] = await sql`
    INSERT INTO teams (team_name, problem_id, problem_statement, edition)
    VALUES (${teamData.team_name}, ${teamData.problem_id}, ${teamData.problem_statement}, ${teamData.edition})
    RETURNING *
  `;

  // Insert all members
  const members = [];
  for (const member of membersData) {
    const [inserted] = await sql`
      INSERT INTO members (team_id, full_name, email, phone, roll_number, department, semester, gender, is_leader)
      VALUES (${team.id}, ${member.full_name}, ${member.email}, ${member.phone}, ${member.roll_number}, ${member.department}, ${member.semester}, ${member.gender}, ${member.is_leader})
      RETURNING *
    `;
    members.push(inserted);
  }

  return { team, members };
}

// ─── Get All Teams ───
export async function getAllTeams() {
  const teams = await sql`
    SELECT t.*, 
           COUNT(m.id) as member_count,
           json_agg(json_build_object(
             'id', m.id,
             'full_name', m.full_name,
             'email', m.email,
             'department', m.department,
             'is_leader', m.is_leader,
             'gender', m.gender
           )) as members
    FROM teams t
    LEFT JOIN members m ON t.id = m.team_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;
  return teams;
}

// ─── Get Team by ID ───
export async function getTeamById(id) {
  const [team] = await sql`SELECT * FROM teams WHERE id = ${id}`;
  if (!team) return null;

  const members = await sql`SELECT * FROM members WHERE team_id = ${id} ORDER BY is_leader DESC`;
  return { ...team, members };
}

// ─── Get Stats ───
export async function getStats() {
  const [teamCount] = await sql`SELECT COUNT(*) as count FROM teams`;
  const [memberCount] = await sql`SELECT COUNT(*) as count FROM members`;
  const [deptStats] = await sql`
    SELECT json_agg(json_build_object('department', department, 'count', cnt)) as departments
    FROM (SELECT department, COUNT(*) as cnt FROM members GROUP BY department ORDER BY cnt DESC) sub
  `;
  return {
    total_teams: parseInt(teamCount.count),
    total_members: parseInt(memberCount.count),
    departments: deptStats?.departments || []
  };
}

// ─── Delete Team ───
export async function deleteTeam(id) {
  const [deleted] = await sql`DELETE FROM teams WHERE id = ${id} RETURNING *`;
  return deleted;
}

// ─── Update Team + Members (handles updates, new inserts, and removals) ───
export async function updateTeam(id, teamData, membersData) {
  const [team] = await sql`
    UPDATE teams
    SET team_name = ${teamData.team_name},
        problem_id = ${teamData.problem_id},
        problem_statement = ${teamData.problem_statement},
        edition = ${teamData.edition}
    WHERE id = ${id}
    RETURNING *
  `;

  if (!team) return null;

  const members = [];
  if (Array.isArray(membersData)) {
    // Remove members that existed before but are no longer in the submitted list
    const existing = await sql`SELECT id FROM members WHERE team_id = ${id}`;
    const keptIds = membersData.filter(m => m.id).map(m => m.id);
    const toRemove = existing.map(e => e.id).filter(eid => !keptIds.includes(eid));
    if (toRemove.length > 0) {
      await sql`DELETE FROM members WHERE id = ANY(${toRemove}) AND team_id = ${id}`;
    }

    for (const member of membersData) {
      if (member.id) {
        // Update existing member
        const [updated] = await sql`
          UPDATE members
          SET full_name = ${member.full_name},
              email = ${member.email},
              phone = ${member.phone},
              roll_number = ${member.roll_number},
              department = ${member.department},
              semester = ${member.semester},
              gender = ${member.gender},
              is_leader = ${member.is_leader}
          WHERE id = ${member.id} AND team_id = ${id}
          RETURNING *
        `;
        if (updated) members.push(updated);
      } else {
        // Insert new member
        const [inserted] = await sql`
          INSERT INTO members (team_id, full_name, email, phone, roll_number, department, semester, gender, is_leader)
          VALUES (${id}, ${member.full_name}, ${member.email}, ${member.phone}, ${member.roll_number}, ${member.department}, ${member.semester}, ${member.gender}, ${member.is_leader})
          RETURNING *
        `;
        members.push(inserted);
      }
    }
  }

  return { team, members };
}

// ─── Check duplicates while excluding a given team's own members ───
export async function checkDuplicatesExcludingTeam(emails, rollNumbers, teamId) {
  const existingEmails = await sql`
    SELECT email FROM members WHERE email = ANY(${emails}) AND team_id != ${teamId}
  `;
  const existingRolls = await sql`
    SELECT roll_number FROM members WHERE roll_number = ANY(${rollNumbers}) AND team_id != ${teamId}
  `;
  return {
    duplicateEmails: existingEmails.map(e => e.email),
    duplicateRolls: existingRolls.map(r => r.roll_number)
  };
}

// ─── Check team name excluding a given team's own record ───
export async function checkTeamNameExcludingTeam(teamName, teamId) {
  const [existing] = await sql`SELECT id FROM teams WHERE team_name = ${teamName} AND id != ${teamId}`;
  return !!existing;
}

// ─── Check if email or roll already exists ───
export async function checkDuplicates(emails, rollNumbers) {
  const existingEmails = await sql`SELECT email FROM members WHERE email = ANY(${emails})`;
  const existingRolls = await sql`SELECT roll_number FROM members WHERE roll_number = ANY(${rollNumbers})`;
  return {
    duplicateEmails: existingEmails.map(e => e.email),
    duplicateRolls: existingRolls.map(r => r.roll_number)
  };
}

// ─── Check if team name exists ───
export async function checkTeamName(teamName) {
  const [existing] = await sql`SELECT id FROM teams WHERE team_name = ${teamName}`;
  return !!existing;
}

export default sql;
