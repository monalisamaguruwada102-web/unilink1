-- TRUNCATE ALL TEST DATA
TRUNCATE TABLE story_reactions CASCADE;
TRUNCATE TABLE story_views CASCADE;
TRUNCATE TABLE post_comments CASCADE;
TRUNCATE TABLE posts CASCADE;
TRUNCATE TABLE stories CASCADE;
TRUNCATE TABLE matches CASCADE;
TRUNCATE TABLE likes CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE confessions CASCADE;
TRUNCATE TABLE marketplace CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE alerts CASCADE;

-- Optional: If you want to keep users but clear everything else, just run above.
-- To also clear users (WARNING: will sign you out):
-- TRUNCATE TABLE users CASCADE;
