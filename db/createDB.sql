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

CREATE TABLE IF NOT EXISTS manual_track_survey (
	id INTEGER PRIMARY KEY,
	uid INTEGER REFERENCES users(userid),
	submit_date date,
	question_step int,
	question_alcohol text,
	question_cigarette text,
	question_sleep int,
	question_work text,
	question_leisure text,
	question_maintenance text,
	question_other_type text,
	question_other text
);

CREATE TABLE IF NOT EXISTS manual_track_entry (
	id INTEGER PRIMARY KEY,
	survey_id INTEGER REFERENCES manual_track_survey(id),
	what_happen text,
	code text,
	time_began text,
	time_end text,
	where_happen text,
	feel text,
	stree text
);