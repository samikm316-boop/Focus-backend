const db = require("../../config/db");

exports.getDashboard = async (userId) => {
  const userQuery = await db.query(
    `
      SELECT id,name
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  const xpQuery = await db.query(
    `
      SELECT COALESCE(SUM(amount),0) as total_xp
      FROM xp_events
      WHERE user_id = $1
    `,
    [userId]
  );

  const notesQuery = await db.query(
    `
      SELECT COUNT(*) as count
      FROM notes
      WHERE user_id = $1
    `,
    [userId]
  );

  const flashcardsQuery = await db.query(
    `
      SELECT COUNT(*) as count
      FROM flashcards
      WHERE user_id = $1
    `,
    [userId]
  );

  const totalXP = Number(xpQuery.rows[0].total_xp || 0);

  return {
    user: {
      id: userQuery.rows[0]?.id,
      name: userQuery.rows[0]?.name || "User",
      avatar: null,
      location: "Unknown",
      status: "Home",
    },

    level: Math.floor(totalXP / 100) + 1,

    xp: totalXP,

    study_xp: totalXP,

    fitness_xp: 0,

    streak: 0,

    notes: Number(notesQuery.rows[0].count || 0),

    flashcards: Number(flashcardsQuery.rows[0].count || 0),

    pending: {
      missed: 0,
      started: 0,
      remaining: 0,
    },

    next_task: {
      title: "No task assigned",
      xp_reward: 0,
    },

    mastery: {
      overall: 0,
      study: 0,
    },
  };
};
