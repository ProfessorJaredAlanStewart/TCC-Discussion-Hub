/**
 * TCC Discussion Hub - Database Migration
 * 
 * Usage:
 *   npm run migrate          - Run all migrations
 *   npm run migrate:reset    - Drop all tables and re-run migrations
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const TABLES = `
-- Users (synced from Canvas)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    canvas_user_id VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses (synced from Canvas)
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    canvas_course_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Discussion Topics
CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    canvas_assignment_id VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    prompt TEXT,
    points_possible INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    points INTEGER DEFAULT 0,
    required_posts INTEGER DEFAULT 1,
    required_replies INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- Posts
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    milestone_id INTEGER REFERENCES milestones(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_at TIMESTAMP WITH TIME ZONE
);

-- Post Edit History (tracks all revisions)
CREATE TABLE IF NOT EXISTS post_edit_history (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    previous_content TEXT NOT NULL,
    previous_word_count INTEGER,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_by INTEGER REFERENCES users(id)
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    duration INTEGER,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id, reaction_type)
);

-- Auto-grade Settings
CREATE TABLE IF NOT EXISTS autograde_settings (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT true,
    min_word_count INTEGER DEFAULT 200,
    min_reply_word_count INTEGER DEFAULT 75,
    late_penalty_percent INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grades
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auto_grade DECIMAL(6,2),
    manual_adjustment DECIMAL(6,2) DEFAULT 0,
    final_grade DECIMAL(6,2),
    synced_to_canvas BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(topic_id, user_id)
);
`;

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_posts_topic ON posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_post ON attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_topic ON grades(topic_id);
CREATE INDEX IF NOT EXISTS idx_grades_user ON grades(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_course ON topics(course_id);
CREATE INDEX IF NOT EXISTS idx_milestones_topic ON milestones(topic_id);
CREATE INDEX IF NOT EXISTS idx_post_edit_history_post ON post_edit_history(post_id);
CREATE INDEX IF NOT EXISTS idx_post_edit_history_date ON post_edit_history(edited_at DESC);
`;

const DROP_ALL = `
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS autograde_settings CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
`;

async function migrate(reset = false) {
    const client = await pool.connect();
    
    try {
        console.log('🗄️  TCC Discussion Hub - Database Migration\n');

        if (reset) {
            console.log('⚠️  Resetting database (dropping all tables)...');
            await client.query(DROP_ALL);
            console.log('✅ Tables dropped\n');
        }

        console.log('📋 Creating tables...');
        await client.query(TABLES);
        console.log('✅ Tables created\n');

        console.log('📇 Creating indexes...');
        await client.query(INDEXES);
        console.log('✅ Indexes created\n');

        // Verify
        const result = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Database tables:');
        result.rows.forEach(row => console.log(`   • ${row.table_name}`));
        
        console.log('\n✅ Migration complete!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run
const reset = process.argv.includes('--reset');
migrate(reset).catch(() => process.exit(1));
