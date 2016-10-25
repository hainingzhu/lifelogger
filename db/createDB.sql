CREATE TABLE IF NOT EXISTS users (
	userid INTEGER PRIMARY KEY,
    name text unique,
    password text not null
);


CREATE TABLE IF NOT EXISTS moves (
	uid INTEGER REFERENCES users(userid),
	moves_token text,
	moves_user_id text,
	moves_refresh_token text
);
