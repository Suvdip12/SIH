// server.js — Express API Server for SIH Registration
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDB,
  createTeam,
  getAllTeams,
  getTeamById,
  getStats,
  deleteTeam,
  checkDuplicates,
  checkTeamName,
  updateTeam,
  checkDuplicatesExcludingTeam,
  checkTeamNameExcludingTeam
} from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───

// POST /api/teams — Register a new team
app.post('/api/teams', async (req, res) => {
  try {
    const { team, members } = req.body;

    // Validate team data
    if (!team?.team_name || !team?.edition) {
      return res.status(400).json({ error: 'Team name and edition are required' });
    }

    // Validate members
    if (!members || members.length < 1 || members.length > 6) {
      return res.status(400).json({ error: 'Team must have 1–6 members' });
    }

    // Check at least one female member
    const hasFemale = members.some(m => m.gender === 'Female');
    if (!hasFemale) {
      return res.status(400).json({ error: 'At least one female member is required in the team' });
    }

    // Check exactly one leader
    const leaders = members.filter(m => m.is_leader);
    if (leaders.length !== 1) {
      return res.status(400).json({ error: 'Exactly one team leader is required' });
    }

    // Check for duplicate team name
    const nameExists = await checkTeamName(team.team_name);
    if (nameExists) {
      return res.status(409).json({ error: `Team name "${team.team_name}" is already taken` });
    }

    // Check for duplicate emails/rolls
    const emails = members.map(m => m.email);
    const rolls = members.map(m => m.roll_number);
    const { duplicateEmails, duplicateRolls } = await checkDuplicates(emails, rolls);

    if (duplicateEmails.length > 0) {
      return res.status(409).json({
        error: `Email(s) already registered: ${duplicateEmails.join(', ')}`
      });
    }
    if (duplicateRolls.length > 0) {
      return res.status(409).json({
        error: `Roll number(s) already registered: ${duplicateRolls.join(', ')}`
      });
    }

    // Create team
    const result = await createTeam(team, members);
    res.status(201).json({ message: 'Team registered successfully!', data: result });

  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === '23505') {
      // Unique constraint violation
      res.status(409).json({ error: 'Duplicate entry detected. A member with this email or roll number may already be registered.' });
    } else {
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Admin authentication middleware
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }
  next();
}

// GET /api/teams — List all teams (Admin Only)
app.get('/api/teams', requireAdmin, async (req, res) => {
  try {
    const teams = await getAllTeams();
    res.json(teams);
  } catch (err) {
    console.error('Fetch teams error:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/:id — Get team details (Admin Only)
app.get('/api/teams/:id', requireAdmin, async (req, res) => {
  try {
    const team = await getTeamById(parseInt(req.params.id));
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(team);
  } catch (err) {
    console.error('Fetch team error:', err);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// GET /api/stats — Registration stats (Publicly accessible for the landing page counter)
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// DELETE /api/teams/:id — Delete a team (Admin Only)
app.delete('/api/teams/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteTeam(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully', data: deleted });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// PUT /api/teams/:id — Update a team and its members (Admin Only)
app.put('/api/teams/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { team, members } = req.body;

    if (!team?.team_name || !team?.edition) {
      return res.status(400).json({ error: 'Team name and edition are required' });
    }

    const existing = await getTeamById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check for duplicate team name (excluding this team)
    const nameExists = await checkTeamNameExcludingTeam(team.team_name, id);
    if (nameExists) {
      return res.status(409).json({ error: `Team name "${team.team_name}" is already taken` });
    }

    // Check for duplicate emails/rolls (excluding this team's own members)
    if (Array.isArray(members) && members.length > 0) {
      if (members.length > 6) {
        return res.status(400).json({ error: 'Team must have 1–6 members' });
      }

      const hasFemale = members.some(m => m.gender === 'Female');
      if (!hasFemale) {
        return res.status(400).json({ error: 'At least one female member is required in the team' });
      }

      const leaders = members.filter(m => m.is_leader);
      if (leaders.length !== 1) {
        return res.status(400).json({ error: 'Exactly one team leader is required' });
      }

      const emails = members.map(m => m.email);
      const rolls = members.map(m => m.roll_number);
      const { duplicateEmails, duplicateRolls } = await checkDuplicatesExcludingTeam(emails, rolls, id);

      if (duplicateEmails.length > 0) {
        return res.status(409).json({
          error: `Email(s) already registered to another team: ${duplicateEmails.join(', ')}`
        });
      }
      if (duplicateRolls.length > 0) {
        return res.status(409).json({
          error: `Roll number(s) already registered to another team: ${duplicateRolls.join(', ')}`
        });
      }
    }

    const result = await updateTeam(id, team, members);
    res.json({ message: 'Team updated successfully!', data: result });

  } catch (err) {
    console.error('Update error:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Duplicate entry detected. A member with this email or roll number may already be registered.' });
    } else {
      res.status(500).json({ error: 'Failed to update team' });
    }
  }
});

// Serve Admin Dashboard specifically
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start Server ───
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 SIH Registration Server running at http://localhost:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api/stats\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('   Make sure your DATABASE_URL in .env is correct.');
    process.exit(1);
  }
}

start();
