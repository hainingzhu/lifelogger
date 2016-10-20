create table if not exists "user" (
    name text unique,
    password text not null
);
