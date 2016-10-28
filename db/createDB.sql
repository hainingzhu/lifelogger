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


CREATE TABLE IF NOT EXISTS rescuetime (
	uid INTEGER REFERENCES users(userid),
	rescuetime_token text
);


CREATE TABLE IF NOT EXISTS fitbit (
    uid INTEGER REFERENCES users(userid),
    fitbit_token text,
    fitbit_user_id text,
    fitbit_refresh_token text
);
