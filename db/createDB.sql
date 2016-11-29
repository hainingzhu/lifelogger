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

CREATE TABLE IF NOT EXISTS auto_track_survey (
	id INTEGER PRIMARY KEY,
	uid INTEGER REFERENCES users(userid),
	submit_date date,
	comments text, 
	step int, 
	alcohol text, 
	cigarette text, 
	sleep text, 
	percent_academic text, 
	percent_social text, 
	percent_personal text, 
	other_name text, 
	percent_other text,
	feedback text
);

CREATE TABLE IF NOT EXISTS auto_track_entry (
	id INTEGER PRIMARY KEY,
	uid INTEGER REFERENCES users(userid),
	submit_date date,
	what_happen text,
	code text,
	time_began text,
	time_end text,
	where_happen text,
	feel text,
	stress text
);

CREATE TABLE IF NOT EXISTS users_manual (
	userid INTEGER PRIMARY KEY,
    name text unique,
    password text not null
);

CREATE TABLE IF NOT EXISTS manual_track_survey (
	id INTEGER PRIMARY KEY,
	uid INTEGER REFERENCES users(userid),
	submit_date date,
	comments text, 
	step int, 
	alcohol text, 
	cigarette text, 
	sleep text, 
	percent_academic text, 
	percent_social text, 
	percent_personal text, 
	other_name text, 
	percent_other text
);

CREATE TABLE IF NOT EXISTS manual_track_entry (
	id INTEGER PRIMARY KEY,
	uid INTEGER REFERENCES users(userid),
	submit_date date,
	what_happen text,
	code text,
	time_began text,
	time_end text,
	where_happen text,
	feel text,
	stress text
);