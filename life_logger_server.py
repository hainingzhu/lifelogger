"""
Hongjian Wang
10/12/2016

Lifelogger server.

Retrieve data from the following services:
1. Moves
2. Rescue Time
3. Fitbit
"""


from flask import Flask, render_template, session, request, url_for, redirect, g
from oauth import moves_oauth_server
import requests
import sqlite3
import ssl
from functools import wraps

context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
context.load_cert_chain('ssl-key/domain.crt', 'ssl-key/domain.key')


app = Flask(__name__)
app.secret_key = "lifelogger"

DATABASE = 'db/lifelogger.db'

moves = moves_oauth_server(app)


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
    return db
    

@app.route("/user_register", methods=['POST'])
def user_register():
    user = request.form.get("name")
    password = request.form.get("password")
    try:
        db = get_db()
        res = db.execute('insert into users (name, password) values ("{0}", "{1}");'.format(user, password))
        db.commit()
        return login("Register succesfully. Please login.")
    except sqlite3.Error as er:
        return login(er.message)
    

@app.route("/check_auth", methods=['POST'])    
def check_auth():
    user = request.form.get("name")
    password = request.form.get("password")
    db = get_db()
    res = db.execute('select userid from users where name="{0}" and password="{1}"; '.format(user, password))
    r = res.fetchall()
    if len(r) == 1:
        session['uid'] = r[0][0]
        session['uname'] = user
        # get Moves login credentials
        moves_login()
        return redirect(url_for("index"))
    else:
        return login("Wrong username or password. Please try again.")


def requires_auth(f):
    """
    My decorator for login check.
    
    If the session['uid'] exists, then the user is logged in.
    Otherwise, redirect user to login page.
    """
    @wraps(f)
    def wrapper(*args, **kwds):
        if 'uid' not in session:
            return login("You are not logged in yet. Please log in")
        return f(*args, **kwds)
    return wrapper
    
        

@app.route("/login")
def login(message=""):
    return render_template("login.html", message=message)


@app.route("/home")
@requires_auth
def index():
    return render_template("index.html")
    


@app.route("/moves")
@requires_auth
def moves_login():
    # check whether current user has already registered the Moves app
    db = get_db()
    res = db.execute('select * from moves where uid="{0}";'.format(session['uid']))
    r = res.fetchone()
    session['moves_token'] = r[1]
    session['moves_user_id'] = r[2]
    session['moves_refresh_token'] = r[3]
    if r is None:
        print "Authentication on Moves server"
        return moves.authorize(callback="https://98.235.161.247:9293/moves_oauth_accept")
    else:
        return " ".join([str(i) for i in r])
    

@app.route("/moves_oauth_accept")
@requires_auth
def moves_oauth_accept():
    print request
    res = moves.authorized_response()
    if res is None:
        return "Access denied. Error message {0}".format(request.args["error"])
    else:
        session['moves_token'] = res['access_token']
        session['moves_user_id'] = res['user_id']
        session['moves_refresh_token'] = res['refresh_token']
        db = get_db()
        db.execute('insert into moves (uid, moves_token, moves_user_id, moves_refresh_token) values \
                         ("{0}", "{1}", "{2}", "{3}");'.format(session['uid'], session['moves_token'], 
                             session['moves_user_id'], session['moves_refresh_token']))
        db.commit()
        return "User ID: {0}. Access token {1}".format(res['user_id'], res['access_token'])
        

@moves.tokengetter
def get_moves_token(token=None):
    return session["moves_token"]


@app.route("/moves_places/<dateStr>")
@requires_auth
def get_moves_places(dateStr):
    if 'moves_user_id' not in session:
        return redirect(url_for('moves_login'))
    else:
        url = "https://api.moves-app.com/api/1.1/user/places/daily/{0}?access_token={1}".format(
                dateStr, session['moves_token'])
        print url
        return requests.get(url).content



@app.teardown_appcontext
def close_db_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()




if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8081, debug=True, ssl_context=context)