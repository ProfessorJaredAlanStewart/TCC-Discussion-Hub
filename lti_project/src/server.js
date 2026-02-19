/**
 * TCC Discussion Hub - LTI 1.3 Server
 * 
 * A Canvas-integrated discussion board with:
 * - LTI 1.3 authentication
 * - Video/audio recording support
 * - Auto-grading with Canvas grade passback
 * - Real-time participation tracking
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// DATABASE
// =============================================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected:', res.rows[0].now);
    }
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers configured for LTI iframe embedding
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            mediaSrc: ["'self'", "blob:", "data:"],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"],
            frameAncestors: ["'self'", "https://*.instructure.com", process.env.LTI_PLATFORM_URL || "https://tccd.instructure.com"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false
}));

// CORS for Canvas
app.use(cors({
    origin: function(origin, callback) {
        const allowed = [
            process.env.LTI_PLATFORM_URL,
            'https://tccd.instructure.com',
            /\.instructure\.com$/
        ];
        if (!origin) return callback(null, true);
        const isAllowed = allowed.some(pattern => {
            if (pattern instanceof RegExp) return pattern.test(origin);
            return origin === pattern;
        });
        callback(null, isAllowed);
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for LTI (must work in iframe)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'discussionhub.sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// File upload configuration
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${uniqueId}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB
    },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/webm', 'video/mp4', 'video/quicktime',
            'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// =============================================================================
// LTI 1.3 IMPLEMENTATION
// =============================================================================

// JWKS client for validating Canvas JWTs
const jwks = jwksClient({
    jwksUri: process.env.LTI_KEYSET_URL || 'https://tccd.instructure.com/api/lti/security/jwks',
    cache: true,
    cacheMaxAge: 86400000, // 24 hours
    rateLimit: true
});

function getSigningKey(header, callback) {
    jwks.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
    });
}

// Generate tool keypair (in production, load from environment)
const { publicKey: toolPublicKey, privateKey: toolPrivateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Tool's JWKS endpoint (Canvas uses this to verify our signatures)
app.get('/.well-known/jwks.json', (req, res) => {
    const keyData = crypto.createPublicKey(toolPublicKey);
    const jwk = keyData.export({ format: 'jwk' });
    jwk.kid = crypto.createHash('sha256').update(toolPublicKey).digest('hex').substring(0, 16);
    jwk.use = 'sig';
    jwk.alg = 'RS256';
    res.json({ keys: [jwk] });
});

// LTI Login Initiation (OIDC Step 1)
app.all('/lti/login', (req, res) => {
    const params = { ...req.query, ...req.body };
    const { iss, login_hint, target_link_uri, lti_message_hint, client_id } = params;

    console.log('LTI Login initiated:', { iss, login_hint: login_hint?.substring(0, 20) + '...' });

    // Validate issuer
    const expectedIssuer = process.env.LTI_PLATFORM_URL || 'https://tccd.instructure.com';
    if (iss !== expectedIssuer) {
        console.error('Invalid issuer:', iss, 'expected:', expectedIssuer);
        return res.status(400).send('Invalid issuer');
    }

    // Generate state and nonce for security
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Store in session
    req.session.lti_state = state;
    req.session.lti_nonce = nonce;

    // Build authorization URL
    const authUrl = new URL(process.env.LTI_AUTH_URL || 'https://tccd.instructure.com/api/lti/authorize_redirect');
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('client_id', process.env.LTI_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${process.env.BASE_URL}/lti/callback`);
    authUrl.searchParams.set('login_hint', login_hint);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('prompt', 'none');
    if (lti_message_hint) {
        authUrl.searchParams.set('lti_message_hint', lti_message_hint);
    }

    req.session.save(() => {
        res.redirect(authUrl.toString());
    });
});

// LTI Callback (OIDC Step 2 - receive id_token)
app.post('/lti/callback', async (req, res) => {
    const { id_token, state, error, error_description } = req.body;

    if (error) {
        console.error('LTI error:', error, error_description);
        return res.status(400).send(`LTI Error: ${error_description || error}`);
    }

    // Validate state
    if (!state || state !== req.session.lti_state) {
        console.error('State mismatch:', { received: state, expected: req.session.lti_state });
        return res.status(400).send('Invalid state - please try launching again');
    }

    try {
        // Verify JWT
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(id_token, getSigningKey, {
                issuer: process.env.LTI_PLATFORM_URL || 'https://tccd.instructure.com',
                audience: process.env.LTI_CLIENT_ID
            }, (err, payload) => {
                if (err) reject(err);
                else resolve(payload);
            });
        });

        // Validate nonce
        if (decoded.nonce !== req.session.lti_nonce) {
            throw new Error('Invalid nonce');
        }

        // Extract LTI claims
        const claims = {
            sub: decoded.sub,
            email: decoded.email || '',
            name: decoded.name || 'Unknown User',
            given_name: decoded.given_name,
            family_name: decoded.family_name,
            picture: decoded.picture,
            roles: decoded['https://purl.imsglobal.org/spec/lti/claim/roles'] || [],
            context: decoded['https://purl.imsglobal.org/spec/lti/claim/context'] || {},
            resource_link: decoded['https://purl.imsglobal.org/spec/lti/claim/resource_link'] || {},
            ags: decoded['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'] || null
        };

        // Determine role
        const isInstructor = claims.roles.some(r => 
            r.includes('Instructor') || r.includes('Administrator') || r.includes('ContentDeveloper')
        );

        // Upsert user
        const userResult = await pool.query(`
            INSERT INTO users (canvas_user_id, email, display_name, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (canvas_user_id) DO UPDATE SET
                email = EXCLUDED.email,
                display_name = EXCLUDED.display_name,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = NOW()
            RETURNING id
        `, [claims.sub, claims.email, claims.name, claims.picture]);

        const userId = userResult.rows[0].id;

        // Upsert course if context provided
        let courseId = null;
        if (claims.context.id) {
            const courseResult = await pool.query(`
                INSERT INTO courses (canvas_course_id, name)
                VALUES ($1, $2)
                ON CONFLICT (canvas_course_id) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
            `, [claims.context.id, claims.context.title || 'Unknown Course']);
            
            courseId = courseResult.rows[0].id;

            // Upsert enrollment
            await pool.query(`
                INSERT INTO enrollments (user_id, course_id, role)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id, course_id) DO UPDATE SET role = EXCLUDED.role
            `, [userId, courseId, isInstructor ? 'instructor' : 'student']);
        }

        // Store session
        req.session.user = {
            id: userId,
            canvasUserId: claims.sub,
            email: claims.email,
            name: claims.name,
            avatar: claims.picture,
            isInstructor,
            courseId,
            canvasCourseId: claims.context.id,
            courseName: claims.context.title,
            ags: claims.ags
        };

        // Clear LTI state
        delete req.session.lti_state;
        delete req.session.lti_nonce;

        console.log('LTI launch successful:', { userId, name: claims.name, isInstructor, courseId });

        req.session.save(() => {
            res.redirect('/app');
        });

    } catch (err) {
        console.error('LTI callback error:', err);
        res.status(400).send(`Authentication failed: ${err.message}`);
    }
});

// LTI Launch endpoint (alternative direct launch)
app.post('/lti/launch', (req, res) => {
    res.redirect(307, '/lti/login');
});

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

function requireAuth(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ error: 'Please launch from Canvas' });
    }
    next();
}

function requireInstructor(req, res, next) {
    if (!req.session?.user?.isInstructor) {
        return res.status(403).json({ error: 'Instructor access required' });
    }
    next();
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', database: 'connected', time: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: err.message });
    }
});

// Current user
app.get('/api/user', requireAuth, (req, res) => {
    const { id, name, email, avatar, isInstructor, courseId, courseName } = req.session.user;
    res.json({ id, name, email, avatar, isInstructor, courseId, courseName });
});

// =============================================================================
// TOPICS API
// =============================================================================

// List topics
app.get('/api/topics', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*,
                COUNT(DISTINCT CASE WHEN p.parent_post_id IS NULL THEN p.id END) as post_count,
                COUNT(DISTINCT CASE WHEN p.parent_post_id IS NOT NULL THEN p.id END) as reply_count,
                COUNT(DISTINCT p.user_id) as participant_count
            FROM topics t
            LEFT JOIN posts p ON t.id = p.topic_id
            WHERE t.course_id = $1
            GROUP BY t.id
            ORDER BY t.created_at DESC
        `, [req.session.user.courseId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching topics:', err);
        res.status(500).json({ error: 'Failed to fetch topics' });
    }
});

// Get single topic with milestones
app.get('/api/topics/:id', requireAuth, async (req, res) => {
    try {
        const topic = await pool.query(
            'SELECT * FROM topics WHERE id = $1 AND course_id = $2',
            [req.params.id, req.session.user.courseId]
        );
        
        if (topic.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const milestones = await pool.query(
            'SELECT * FROM milestones WHERE topic_id = $1 ORDER BY sort_order',
            [req.params.id]
        );

        res.json({ ...topic.rows[0], milestones: milestones.rows });
    } catch (err) {
        console.error('Error fetching topic:', err);
        res.status(500).json({ error: 'Failed to fetch topic' });
    }
});

// Create topic
app.post('/api/topics', requireInstructor, async (req, res) => {
    const { title, prompt, points_possible, status, milestones } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const result = await client.query(`
            INSERT INTO topics (course_id, title, prompt, points_possible, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [req.session.user.courseId, title, prompt, points_possible || 100, status || 'active', req.session.user.id]);
        
        const topic = result.rows[0];

        // Add milestones
        if (milestones?.length) {
            for (let i = 0; i < milestones.length; i++) {
                const m = milestones[i];
                await client.query(`
                    INSERT INTO milestones (topic_id, name, due_date, points, required_posts, required_replies, sort_order)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [topic.id, m.name, m.due_date, m.points || 0, m.required_posts || 1, m.required_replies || 0, i]);
            }
        }

        // Create default autograde settings
        await client.query(`
            INSERT INTO autograde_settings (topic_id) VALUES ($1)
        `, [topic.id]);

        await client.query('COMMIT');
        res.status(201).json(topic);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating topic:', err);
        res.status(500).json({ error: 'Failed to create topic' });
    } finally {
        client.release();
    }
});

// =============================================================================
// POSTS API
// =============================================================================

// Get posts for topic
app.get('/api/topics/:topicId/posts', requireAuth, async (req, res) => {
    try {
        // Get main posts
        const posts = await pool.query(`
            SELECT p.*,
                u.display_name as author_name,
                u.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM posts r WHERE r.parent_post_id = p.id) as reply_count,
                (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like') as like_count,
                (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'insightful') as insightful_count,
                EXISTS(SELECT 1 FROM reactions r WHERE r.post_id = p.id AND r.user_id = $2 AND r.reaction_type = 'like') as user_liked,
                EXISTS(SELECT 1 FROM reactions r WHERE r.post_id = p.id AND r.user_id = $2 AND r.reaction_type = 'insightful') as user_marked_insightful,
                (SELECT e.role FROM enrollments e WHERE e.user_id = p.user_id AND e.course_id = $3) as author_role
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.topic_id = $1 AND p.parent_post_id IS NULL
            ORDER BY p.created_at DESC
        `, [req.params.topicId, req.session.user.id, req.session.user.courseId]);

        // Get attachments and replies for each post
        for (const post of posts.rows) {
            post.attachments = (await pool.query(
                'SELECT * FROM attachments WHERE post_id = $1', [post.id]
            )).rows;

            post.replies = (await pool.query(`
                SELECT p.*,
                    u.display_name as author_name,
                    u.avatar_url as author_avatar,
                    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'like') as like_count,
                    (SELECT e.role FROM enrollments e WHERE e.user_id = p.user_id AND e.course_id = $2) as author_role
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.parent_post_id = $1
                ORDER BY p.created_at ASC
            `, [post.id, req.session.user.courseId])).rows;
        }

        res.json(posts.rows);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Create post
app.post('/api/topics/:topicId/posts', requireAuth, upload.array('files', 5), async (req, res) => {
    const { content, parent_post_id, milestone_id } = req.body;
    const wordCount = content?.trim().split(/\s+/).length || 0;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(`
            INSERT INTO posts (topic_id, user_id, content, word_count, parent_post_id, milestone_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [req.params.topicId, req.session.user.id, content, wordCount, parent_post_id || null, milestone_id || null]);

        const post = result.rows[0];

        // Save attachments
        if (req.files?.length) {
            for (const file of req.files) {
                const type = file.mimetype.startsWith('video/') ? 'video' :
                            file.mimetype.startsWith('audio/') ? 'audio' :
                            file.mimetype.startsWith('image/') ? 'image' : 'file';
                
                await client.query(`
                    INSERT INTO attachments (post_id, type, filename, original_filename, file_size, mime_type, storage_path)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [post.id, type, file.filename, file.originalname, file.size, file.mimetype, file.path]);
            }
        }

        await client.query('COMMIT');

        // Trigger grade recalculation (async)
        recalculateGrade(req.params.topicId, req.session.user.id).catch(console.error);

        res.status(201).json(post);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating post:', err);
        res.status(500).json({ error: 'Failed to create post' });
    } finally {
        client.release();
    }
});

// =============================================================================
// REACTIONS API
// =============================================================================

app.post('/api/posts/:postId/reactions', requireAuth, async (req, res) => {
    const { reaction_type } = req.body;
    const postId = req.params.postId;
    const userId = req.session.user.id;

    try {
        const existing = await pool.query(
            'SELECT id FROM reactions WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3',
            [postId, userId, reaction_type]
        );

        if (existing.rows.length) {
            await pool.query('DELETE FROM reactions WHERE id = $1', [existing.rows[0].id]);
            res.json({ action: 'removed' });
        } else {
            await pool.query(
                'INSERT INTO reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)',
                [postId, userId, reaction_type]
            );
            res.json({ action: 'added' });
        }
    } catch (err) {
        console.error('Error toggling reaction:', err);
        res.status(500).json({ error: 'Failed to toggle reaction' });
    }
});

// =============================================================================
// POST EDITING API
// =============================================================================

// Edit a post (author only)
app.patch('/api/posts/:postId', requireAuth, async (req, res) => {
    const { content } = req.body;
    const postId = req.params.postId;
    const userId = req.session.user.id;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const newWordCount = content.trim().split(/\s+/).length;

    try {
        // Verify ownership
        const post = await pool.query(
            'SELECT * FROM posts WHERE id = $1',
            [postId]
        );

        if (post.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'You can only edit your own posts' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Save current content to edit history
            await client.query(`
                INSERT INTO post_edit_history (post_id, previous_content, previous_word_count, edited_by)
                VALUES ($1, $2, $3, $4)
            `, [postId, post.rows[0].content, post.rows[0].word_count, userId]);

            // Update the post
            const result = await client.query(`
                UPDATE posts 
                SET content = $1, word_count = $2, updated_at = NOW(), last_edited_at = NOW()
                WHERE id = $3
                RETURNING *
            `, [content, newWordCount, postId]);

            await client.query('COMMIT');

            // Recalculate grade
            recalculateGrade(result.rows[0].topic_id, userId).catch(console.error);

            res.json(result.rows[0]);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error editing post:', err);
        res.status(500).json({ error: 'Failed to edit post' });
    }
});

// Get edit history for a post (instructor only)
app.get('/api/posts/:postId/history', requireInstructor, async (req, res) => {
    try {
        const post = await pool.query(`
            SELECT p.*, u.display_name as author_name
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `, [req.params.postId]);

        if (post.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const history = await pool.query(`
            SELECT h.*, u.display_name as edited_by_name
            FROM post_edit_history h
            LEFT JOIN users u ON h.edited_by = u.id
            WHERE h.post_id = $1
            ORDER BY h.edited_at DESC
        `, [req.params.postId]);

        res.json({
            currentPost: post.rows[0],
            editHistory: history.rows,
            totalEdits: history.rows.length
        });
    } catch (err) {
        console.error('Error fetching edit history:', err);
        res.status(500).json({ error: 'Failed to fetch edit history' });
    }
});

// Get all posts with edit counts for a topic (instructor analytics)
app.get('/api/topics/:topicId/edit-analytics', requireInstructor, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.content,
                p.word_count,
                p.created_at,
                p.last_edited_at,
                u.display_name as author_name,
                u.email as author_email,
                (SELECT COUNT(*) FROM post_edit_history h WHERE h.post_id = p.id) as edit_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.topic_id = $1 AND p.parent_post_id IS NULL
            ORDER BY (SELECT COUNT(*) FROM post_edit_history h WHERE h.post_id = p.id) DESC, p.created_at DESC
        `, [req.params.topicId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching edit analytics:', err);
        res.status(500).json({ error: 'Failed to fetch edit analytics' });
    }
});

// =============================================================================
// GRADES API (Instructor)
// =============================================================================

app.get('/api/topics/:topicId/grades', requireInstructor, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, u.display_name, u.email,
                COUNT(DISTINCT CASE WHEN p.parent_post_id IS NULL THEN p.id END)::int as post_count,
                COUNT(DISTINCT CASE WHEN p.parent_post_id IS NOT NULL THEN p.id END)::int as reply_count,
                ROUND(COALESCE(AVG(p.word_count), 0))::int as avg_word_count,
                MAX(p.created_at) as last_activity,
                g.auto_grade, g.manual_adjustment, g.final_grade, g.synced_to_canvas
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN posts p ON p.user_id = u.id AND p.topic_id = $1
            LEFT JOIN grades g ON g.user_id = u.id AND g.topic_id = $1
            WHERE e.course_id = $2 AND e.role = 'student'
            GROUP BY u.id, g.auto_grade, g.manual_adjustment, g.final_grade, g.synced_to_canvas
            ORDER BY u.display_name
        `, [req.params.topicId, req.session.user.courseId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching grades:', err);
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});

// =============================================================================
// AUTO-GRADING
// =============================================================================

async function recalculateGrade(topicId, userId) {
    try {
        const settings = await pool.query(
            'SELECT * FROM autograde_settings WHERE topic_id = $1',
            [topicId]
        );
        if (!settings.rows.length || !settings.rows[0].enabled) return;

        const config = settings.rows[0];
        const topic = await pool.query('SELECT points_possible FROM topics WHERE id = $1', [topicId]);
        const total = topic.rows[0]?.points_possible || 100;

        const posts = await pool.query(
            'SELECT * FROM posts WHERE topic_id = $1 AND user_id = $2',
            [topicId, userId]
        );

        const initial = posts.rows.filter(p => !p.parent_post_id);
        const replies = posts.rows.filter(p => p.parent_post_id);

        let earned = 0;

        // Initial post (40%)
        if (initial.length > 0) {
            const pct = Math.min(initial[0].word_count / config.min_word_count, 1);
            earned += pct * total * 0.4;
        }

        // Replies (40%)
        const validReplies = replies.filter(r => r.word_count >= config.min_reply_word_count);
        const replyPct = Math.min(validReplies.length / 2, 1);
        earned += replyPct * total * 0.4;

        // Engagement bonus (20%) - simplified
        if (initial.length && validReplies.length >= 2) {
            earned += total * 0.2;
        }

        await pool.query(`
            INSERT INTO grades (topic_id, user_id, auto_grade, final_grade)
            VALUES ($1, $2, $3, $3)
            ON CONFLICT (topic_id, user_id) DO UPDATE SET
                auto_grade = $3,
                final_grade = $3 + COALESCE(grades.manual_adjustment, 0),
                updated_at = NOW()
        `, [topicId, userId, Math.round(earned * 100) / 100]);

    } catch (err) {
        console.error('Grade calculation error:', err);
    }
}

// =============================================================================
// CANVAS LTI ASSIGNMENT & GRADE SERVICES (AGS)
// =============================================================================

/**
 * Create a Canvas assignment via LTI Deep Linking / AGS
 * This creates a line item in Canvas that links back to this discussion
 */
app.post('/api/canvas/create-assignment', requireInstructor, async (req, res) => {
    const { topicId, title, description, pointsPossible, dueAt } = req.body;
    const { courseId, platformUrl } = req.session.lti;

    try {
        // Get the AGS line items endpoint from LTI context
        const lineItemsUrl = req.session.lti?.services?.lineItems;
        
        if (!lineItemsUrl) {
            return res.status(400).json({ 
                error: 'Canvas AGS not available. Ensure LTI tool has Assignment and Grade Services enabled.' 
            });
        }

        // Get access token for Canvas API
        const accessToken = await getCanvasAccessToken(req.session.lti);

        // Create line item (assignment) in Canvas
        const lineItemResponse = await fetch(lineItemsUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scoreMaximum: pointsPossible,
                label: title,
                resourceId: `discussion-${topicId}`,
                tag: 'discussion',
                resourceLinkId: req.session.lti?.resourceLinkId,
                startDateTime: new Date().toISOString(),
                endDateTime: dueAt ? new Date(dueAt).toISOString() : null,
                submission: {
                    submissionType: ['external_tool']
                }
            })
        });

        if (!lineItemResponse.ok) {
            throw new Error(`Canvas API error: ${lineItemResponse.status}`);
        }

        const lineItem = await lineItemResponse.json();

        // Store the line item URL for grade passback
        await pool.query(`
            UPDATE topics 
            SET canvas_assignment_id = $1, canvas_line_item_url = $2 
            WHERE id = $3
        `, [lineItem.id, lineItem.id, topicId]);

        res.json({
            success: true,
            assignmentId: lineItem.id,
            lineItemUrl: lineItem.id
        });

    } catch (error) {
        console.error('Canvas assignment creation error:', error);
        res.status(500).json({ error: 'Failed to create Canvas assignment' });
    }
});

/**
 * Sync grades to Canvas via LTI AGS
 * Sends scores for all students to the Canvas gradebook
 */
app.post('/api/canvas/sync-grades', requireInstructor, async (req, res) => {
    const { lineItemUrl, grades } = req.body;

    try {
        // Get access token for Canvas API
        const accessToken = await getCanvasAccessToken(req.session.lti);

        // AGS scores endpoint
        const scoresUrl = `${lineItemUrl}/scores`;

        let successCount = 0;
        let errorCount = 0;

        // Send each grade to Canvas
        for (const grade of grades) {
            try {
                const scoreResponse = await fetch(scoresUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/vnd.ims.lis.v1.score+json'
                    },
                    body: JSON.stringify({
                        userId: grade.userId,
                        scoreGiven: grade.score,
                        scoreMaximum: grade.maxScore || 100,
                        activityProgress: 'Completed',
                        gradingProgress: 'FullyGraded',
                        timestamp: new Date().toISOString()
                    })
                });

                if (scoreResponse.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Grade sync failed for user ${grade.userId}`);
                }
            } catch (err) {
                errorCount++;
            }
        }

        res.json({
            success: true,
            synced: successCount,
            failed: errorCount
        });

    } catch (error) {
        console.error('Canvas grade sync error:', error);
        res.status(500).json({ error: 'Failed to sync grades to Canvas' });
    }
});

/**
 * Get Canvas access token using LTI 1.3 OAuth2 client credentials flow
 */
async function getCanvasAccessToken(ltiContext) {
    const tokenUrl = `${ltiContext.platformUrl}/login/oauth2/token`;
    
    // Create JWT assertion for client credentials grant
    const assertion = jwt.sign({
        iss: process.env.LTI_CLIENT_ID,
        sub: process.env.LTI_CLIENT_ID,
        aud: tokenUrl,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        jti: crypto.randomUUID()
    }, process.env.LTI_PRIVATE_KEY, { algorithm: 'RS256' });

    const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            client_assertion: assertion,
            scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score'
        })
    });

    if (!tokenResponse.ok) {
        throw new Error('Failed to get Canvas access token');
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
}

// =============================================================================
// MAIN APP ROUTE
// =============================================================================

app.get('/app', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
    if (req.session?.user) {
        return res.redirect('/app');
    }
    res.send(`
        <html>
        <head><title>TCC Discussion Hub</title></head>
        <body style="font-family: Georgia, serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h1 style="color: #006184;">TCC Discussion Hub</h1>
            <p>This application must be launched from Canvas.</p>
            <p>Please access Discussion Hub through your Canvas course.</p>
        </body>
        </html>
    `);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           TCC Discussion Hub Server Started               ║
╠═══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                              ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(39)}║
║  Base URL: ${(process.env.BASE_URL || 'http://localhost:' + PORT).padEnd(43)}║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
